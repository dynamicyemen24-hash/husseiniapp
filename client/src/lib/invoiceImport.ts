export type ImportedInvoiceLine = {
  code?: string;
  name: string;
  quantity: number;
  unitPrice: string;
  discount: string;
};

const keyOf = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[\s_-]+/g, "");

const aliases = {
  code: [
    "code",
    "sku",
    "itemcode",
    "productcode",
    "barcode",
    "رمز",
    "كود",
    "باركود",
  ],
  name: [
    "name",
    "item",
    "description",
    "product",
    "productname",
    "itemname",
    "الاسم",
    "الصنف",
    "المنتج",
    "الوصف",
  ],
  quantity: ["quantity", "qty", "invoicedquantity", "count", "الكمية", "عدد"],
  unitPrice: [
    "unitprice",
    "price",
    "priceamount",
    "rate",
    "سعر",
    "سعرالوحدة",
    "سعرالوحده",
  ],
  discount: ["discount", "allowance", "discountamount", "الخصم"],
};

function valueFor(row: Record<string, unknown>, field: keyof typeof aliases) {
  const found = Object.entries(row).find(([key]) =>
    aliases[field].includes(keyOf(key))
  );
  return found?.[1];
}

function normalizeLines(rows: unknown[]): ImportedInvoiceLine[] {
  return rows
    .filter(row => row && typeof row === "object" && !Array.isArray(row))
    .map(row => {
      const record = row as Record<string, unknown>;
      const name = String(valueFor(record, "name") ?? "").trim();
      const quantity = Number(valueFor(record, "quantity") ?? 1);
      const unitPrice = Number(valueFor(record, "unitPrice") ?? 0);
      const discount = Number(valueFor(record, "discount") ?? 0);
      return {
        code: String(valueFor(record, "code") ?? "").trim() || undefined,
        name,
        quantity,
        unitPrice: String(unitPrice),
        discount: String(discount),
      };
    })
    .filter(
      line =>
        line.name.length > 0 &&
        Number.isFinite(line.quantity) &&
        line.quantity > 0 &&
        Number.isFinite(Number(line.unitPrice)) &&
        Number(line.unitPrice) >= 0 &&
        Number.isFinite(Number(line.discount)) &&
        Number(line.discount) >= 0
    )
    .slice(0, 500);
}

function parseCsv(text: string): unknown[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", "\t", ";"].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length
  )[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(value => value)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(value => value)) rows.push(row);
  const headers = rows.shift() ?? [];
  return rows.map(values =>
    Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
  );
}

function parseXml(text: string): unknown[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("ملف XML غير صالح");
  const elements = Array.from(doc.getElementsByTagName("*"));
  const local = (el: Element, name: string) =>
    el.localName.toLowerCase() === name.toLowerCase();
  const lines = elements.filter(el =>
    ["InvoiceLine", "LineItem", "item"].includes(el.localName)
  );
  return lines.map(line => {
    const descendants = Array.from(line.getElementsByTagName("*"));
    const textOf = (...names: string[]) =>
      descendants
        .find(el => names.some(name => local(el, name)))
        ?.textContent?.trim() ?? "";
    return {
      itemName: textOf("Name", "Description", "ItemName"),
      itemCode: textOf("ID", "SellersItemIdentification", "ItemCode", "SKU"),
      invoicedQuantity: textOf("InvoicedQuantity", "Quantity", "Qty") || "1",
      priceAmount: textOf("PriceAmount", "UnitPrice", "Price") || "0",
      discountAmount:
        textOf("Amount", "AllowanceTotalAmount", "Discount") || "0",
    };
  });
}

async function unzipEntry(
  buffer: ArrayBuffer,
  entry: {
    offset: number;
    size: number;
    uncompressedSize: number;
    method: number;
  }
) {
  if (entry.uncompressedSize > 25 * 1024 * 1024)
    throw new Error("حجم محتوى Excel بعد فك الضغط يتجاوز الحد المسموح");
  const view = new DataView(buffer);
  const headerSize = view.getUint16(entry.offset + 26, true);
  const extraSize = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + headerSize + extraSize;
  const bytes = new Uint8Array(buffer, start, entry.size);
  if (entry.method === 0) {
    if (bytes.byteLength !== entry.uncompressedSize)
      throw new Error("بيانات ورقة Excel غير مكتملة");
    return bytes;
  }
  if (entry.method !== 8 || typeof DecompressionStream === "undefined") {
    throw new Error("تعذر فك ضغط ورقة Excel في هذا المتصفح");
  }
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  const result = new Uint8Array(await new Response(stream).arrayBuffer());
  if (result.byteLength !== entry.uncompressedSize)
    throw new Error("بيانات ورقة Excel غير مكتملة");
  return result;
}

async function parseXlsx(file: File): Promise<unknown[]> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let eocd = -1;
  for (
    let offset = buffer.byteLength - 22;
    offset >= Math.max(0, buffer.byteLength - 65_557);
    offset--
  ) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === buffer.byteLength
    ) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("ملف Excel غير صالح أو غير مدعوم");
  const entries = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const files = new Map<
    string,
    { offset: number; size: number; uncompressedSize: number; method: number }
  >();
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error("فهرس ملف Excel تالف");
    const method = view.getUint16(cursor + 10, true);
    const size = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(
      new Uint8Array(buffer, cursor + 46, nameLength)
    );
    files.set(name, { offset: localOffset, size, uncompressedSize, method });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const sheetPath = [...files.keys()].find(path =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(path)
  );
  if (!sheetPath) throw new Error("لا توجد ورقة بيانات في ملف Excel");
  const readXml = async (path: string) => {
    const entry = files.get(path);
    return entry ? decoder.decode(await unzipEntry(buffer, entry)) : "";
  };
  const sharedXml = await readXml("xl/sharedStrings.xml");
  const sharedDoc = sharedXml
    ? new DOMParser().parseFromString(sharedXml, "application/xml")
    : null;
  const strings = sharedDoc
    ? Array.from(sharedDoc.getElementsByTagName("si"), si =>
        Array.from(
          si.getElementsByTagName("t"),
          node => node.textContent ?? ""
        ).join("")
      )
    : [];
  const sheetDoc = new DOMParser().parseFromString(
    await readXml(sheetPath),
    "application/xml"
  );
  if (sheetDoc.querySelector("parsererror"))
    throw new Error("تعذر قراءة بيانات ورقة Excel");
  const rows = Array.from(sheetDoc.getElementsByTagName("row"), row => {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const column = cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0] ?? "A";
      const index =
        [...column].reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0) -
        1;
      const value =
        cell.getElementsByTagName("v")[0]?.textContent ??
        cell.getElementsByTagName("t")[0]?.textContent ??
        "";
      values[index] =
        cell.getAttribute("t") === "s" ? (strings[Number(value)] ?? "") : value;
    }
    return values;
  }).filter(row => row.some(Boolean));
  const headers = rows.shift() ?? [];
  return rows.map(values =>
    Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
  );
}

export async function parseInvoiceImportFile(
  file: File
): Promise<ImportedInvoiceLine[]> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error("الحد الأقصى لحجم الملف 15 ميجابايت");
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rows: unknown[];
  if (extension === "xlsx") {
    rows = await parseXlsx(file);
  } else {
    const text = await file.text();
    if (extension === "json") {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed)
        ? parsed
        : (parsed.items ?? parsed.lines ?? parsed.InvoiceLine ?? []);
    } else if (extension === "xml") rows = parseXml(text);
    else if (extension === "csv" || extension === "tsv" || extension === "txt")
      rows = parseCsv(text);
    else throw new Error("الصيغ المدعومة: XLSX وCSV وJSON وXML");
  }
  const lines = normalizeLines(rows);
  if (!lines.length)
    throw new Error("لم أجد تفاصيل صالحة. تأكد من أعمدة الصنف والكمية والسعر.");
  return lines;
}

export function downloadInvoiceImportTemplate() {
  const csv = "\uFEFFرمز الصنف,اسم الصنف,الكمية,سعر الوحدة,الخصم\r\n";
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "invoice-lines-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
