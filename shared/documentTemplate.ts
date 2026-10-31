export interface DocumentHeader {
  showCompanyName: boolean;
  showLogo: boolean;
  companyName: string;
  logoUrl: string;
  customTextAbove: string;
  customTextBelow: string;
  backgroundColor: string;
  textColor: string;
  fontSize: "sm" | "md" | "lg";
  borderBottom: boolean;
}

export interface DocumentFooter {
  showPageNumbers: boolean;
  showDate: boolean;
  showCompanyName: boolean;
  customTextAbove: string;
  customTextBelow: string;
  backgroundColor: string;
  textColor: string;
  fontSize: "sm" | "md" | "lg";
  borderTop: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  header: DocumentHeader;
  footer: DocumentFooter;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paperSize: "a4" | "letter" | "legal" | "custom";
  orientation: "portrait" | "landscape";
  fontFamily: string;
  language: "ar" | "en" | "both";
  rtl: boolean;
}

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplate = {
  id: "default",
  name: "القالب الافتراضي",
  isDefault: true,
  header: {
    showCompanyName: false,
    showLogo: false,
    companyName: "",
    logoUrl: "",
    customTextAbove: "",
    customTextBelow: "",
    backgroundColor: "#ffffff",
    textColor: "#17211f",
    fontSize: "md",
    borderBottom: false,
  },
  footer: {
    showPageNumbers: true,
    showDate: false,
    showCompanyName: false,
    customTextAbove: "",
    customTextBelow: "",
    backgroundColor: "#ffffff",
    textColor: "#777777",
    fontSize: "sm",
    borderTop: false,
  },
  marginTop: 26,
  marginBottom: 26,
  marginLeft: 26,
  marginRight: 26,
  paperSize: "a4",
  orientation: "portrait",
  fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
  language: "both",
  rtl: true,
};

export function mergeDocumentTemplate(
  def: DocumentTemplate,
  raw: unknown
): DocumentTemplate {
  if (!raw || typeof raw !== "object") return { ...def };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object")
        return { ...def, ...parsed } as DocumentTemplate;
    } catch {
      return { ...def };
    }
  }
  return { ...def, ...(raw as Partial<DocumentTemplate>) } as DocumentTemplate;
}
