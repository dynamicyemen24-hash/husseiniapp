import { brand, whatsappLink } from "@/lib/brand";

export default function PrivacyPolicy() {
  return (
    <section
      className="
        min-h-screen
        w-full
        px-4
        py-12
        bg-sand
        text-ink
        antialiased
      "
    >
      <div className="max-w-2xl mx-auto text-center">
        <h1
          className="
            text-2xl md:text-3xl lg:text-4xl font-bold mb-6
            rtl:text-right
          "
        >
          سياسة الخصوصية
        </h1>

        <p className="text-lg mb-8 rtl:text-right max-w-2xl mx-auto">
          last updated: {new Date().toLocaleDateString("ar-AE")}
        </p>

        <div className="prose rtl:text-right max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">مقدمة</h2>
          <p>
            سياسة الخصوصية هذه تشرح كيف تجمع {brand.names.legal} (
            {brand.contact.email}) وتستخدم وتكشف المعلومات التي تقدمها عند
            استخدام موقعنا وخدماتنا الرقمية، ومنها نظام {brand.names.erpDisplay}
            .
          </p>

          <h2 className="text-xl font-semibold mb-4">المعلومات التي نجمعها</h2>
          <ul className="list-disc rtl:text-right mb-6 pl-8 space-y-2">
            <li>
              بيانات التواصل: الاسم، رقم الهاتف، البريد الإلكتروني، العنوان
            </li>
            <li>بيانات المؤسسة: اسم المؤسسة، رقم السجل التجاري، الفروع</li>
            <li>بيانات الدفع: في حال تقديم مدفوعات عبر المنصة</li>
            <li>بيانات الاستخدام: معلومات حول تفاعلك مع المنصة</li>
          </ul>

          <h2 className="text-xl font-semibold mb-4">كيف نستخدم معلوماتك</h2>
          <p>نستخدم المعلومات التالية لتقديم وتشغيل وتحسين المنصة:</p>
          <ul className="list-disc rtl:text-right mb-6 pl-8 space-y-2">
            <li>إدارة حسابك والمؤسستك</li>
            <li>توفير الخدمات والميزات التي طلبتها</li>
            <li>التواصل معك بشأن حسابك ومنصتنا</li>
            <li>تحسين المنصة وميزاتها</li>
            <li>الوفاء بالتزاماتنا القانونية والتنظيمية</li>
          </ul>

          <h2 className="text-xl font-semibold mb-4">مشاركة المعلومات</h2>
          <p>
            لا نبيع ولا نؤجر بياناتك الشخصية لطرف ثالث. قد نشارك المعلومات في
            الحالات التالية:
          </p>
          <ul className="list-disc rtl:text-right mb-6 pl-8 space-y-2">
            <li>متى كان مطلوباً ذلك بموجب القانون أو الأنظمة الحكومية</li>
            <li>لتطبيق شروط وأحكام خدمتنا</li>
            <li>لحماية حقوقنا وممتلكاتنا ومستخدمينا</li>
            <li>في حال Merge بيع الكيان أو merging معه</li>
          </ul>

          <h2 className="text-xl font-semibold mb-4">حماية بياناتك</h2>
          <p>
            نطبق تدابير أمنية مناسبة لحماية بياناتك من الوصول غير المصرح به
            والتغيير أو الكشف. ومع ذلك، لا يمكن ضمان نقل البيانات عبر الإنترنت
            أو التخزين الإلكتروني أن يكون آمنًا بالكامل.
          </p>

          <h2 className="text-xl font-semibold mb-4">روابط المواقع الخارجية</h2>
          <p>
            قد تحتوي منصتنا على روابط لمواقع خارجية ليس لها علاقة بنا. سياسة
            الخصوصية هذه لا تغطي ممارسات تلك المواقع. يجب عليك مراجعة سياسات
            الخصوصية لتلك المواقع عند زيارة هذه الروابط.
          </p>

          <h2 className="text-xl font-semibold mb-4">
            التغييرات على سياسة الخصوصية
          </h2>
          <p>
            نحتفظ بالحق في تعديل هذه السياسة في أي وقت. سننشر أي تغييرات على هذه
            الصفحة وسنبلغك بالتغييرات الجوهرية وفق المتطلبات القانونية.
          </p>

          <h2 className="text-xl font-semibold mb-4">اتصل بنا</h2>
          <p>
            إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه، يمكنك
            التواصل معنا عبر:
          </p>
          <address className="mt-6 rtl:text-right">
            {brand.contact.address}
            <br />
            الهاتف: {brand.contact.phone}
            <br />
            البريد الإلكتروني: {brand.contact.email}
          </address>
        </div>
      </div>
    </section>
  );
}
