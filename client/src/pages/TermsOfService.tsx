import { brand, whatsappLink } from "@/lib/brand";

export default function TermsOfService() {
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
          الشروط والأحكام
        </h1>

        <p className="text-lg mb-8 rtl:text-right">
          last updated: {new Date().toLocaleDateString("ar-AE")}
        </p>

        <div className="prose rtl:text-right max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">مقدمة</h2>
          <p>
            بالشروط والأحكام التالية ("الشروط")، يمكنك الوصول إلى موقع الحسينية
            وخدماتها الرقمية، ومنها نظام {brand.names.erpDisplay} ("الخدمات").
            من خلال الوصول إلى هذه الخدمات أو استخدامها، فإنك توافق على هذه
            الشروط. إذا كنت لا توافق على أي جزء من الشروط، فيُرجى عدم استخدام
            المنصة.
          </p>

          <h2 className="text-xl font-semibold mb-4">تعريفات</h2>
          <dl className="rtl text-right space-y-4 mb-8">
            <div>
              <dt className="font-medium mb-2">المؤسسة</dt>
              <dd>مجموعة الحسينية</dd>
            </div>
            <div>
              <dt className="font-medium mb-2">المنصة</dt>
              <dd>ALHUSAINIA — منظومة الأعمال الموحّدة</dd>
            </div>
            <div>
              <dt className="font-medium mb-2">المستخدم</dt>
              <dd>أي فرد أو كيان يستخدم المنصة</dd>
            </div>
          </dl>

          <h2 className="text-xl font-semibold mb-4">استخدام المنصة</h2>
          <p>
            يقع على المستخدم مسؤولية ضمان حصوله على وصول إلى المنصة واستخدامها
            بشكل قانوني. تشمل الالتزامات التالية:
          </p>
          <ul className="list-disc rtl:text-right mb-6 pl-8 space-y-2">
            <li>استخدام المنصة للأغراض القانونية فقط</li>
            <li>عدم انتهاك أي قوانين أو لوائح ذات صلة</li>
            <li>الحفاظ على سرية بيانات الدخول الخاصة بك</li>
            <li>عدم محاولة الحصول على وصول غير مصرح به إلى حساب أو نظام</li>
          </ul>

          <h2 className="text-xl font-semibold mb-4">الملكية الفكرية</h2>
          <p>
            جميع المحتوى الموجود في المنصة (بما في ذلك على سبيل المثال لا الحصر
            النصوص، والصور، والرسوم البيانية، والتصاميم، والبرامج) مملوكة من قبل
            مؤسسة الحسينية لخدمات الأعمال أو مرخصيها، ويخضع للحماية بموجب قوانين
            الملكية الفكرية وحقوق النشر.
          </p>
          <p>
            يمنع منعًا باتًا نسخ أو توزيع أو نشر أو إعادة نشر أي محتوى من المنصة
            دون الحصول على إذن كتابي مسبق.
          </p>

          <h2 className="text-xl font-semibold mb-4">
            المحتوى الذي ينشئه المستخدم
          </h2>
          <p>
            عند نشر أي محتوى على المنصة، فإنك تمنح مؤسسة الحسينية ترخيصًا غير
            حصري، وخالٍ من royalties، وقابل للتحويل، worldwide لاستخدام هذا
            المحتوى وتعديله وعرضه وتوزيعه على المنصة.
          </p>
          <p>
            وتحتفظ المؤسسة بحقها في إزالة أي محتوى ينتهك هذه الشروط أو هو غير
            قانوني أو مسيء أو غير لائق.
          </p>

          <h2 className="text-xl font-semibold mb-4">الخصوصية</h2>
          <p>
            استخدامك للمنصة يخضع أيضًا لسياسة الخصوصية الخاصة بنا. الرجاء مراجعة
            سياسة الخصوصية لفهم كيفية جمع معلوماتك الشخصية واستخدامها وكشفها.
          </p>

          <h2 className="text-xl font-semibold mb-4">تعويضات</h2>
          <p>
            توافق على تعويض المؤسسة وحمايتها وإبقائها ضد أي مطالبات أو خسائر أو
            أضرار أو نفقات، بما في ذلك أتعاب المحاماة، الناجمة عن استخدامك
            للمنصة أو انتهاكك لهذه الشروط.
          </p>

          <h2 className="text-xl font-semibold mb-4">إنهاء الخدمة</h2>
          <p>
            يحق للمؤسسة إنهاء حقك في استخدام المنصة في أي وقت، دون إشعار، لأي
            سبب كان، بما في ذلك انتهاك أي من الشروط. upon إنهاء الخدمة، يحق لك
            الاستمرار في استخدام المنصة حتى تاريخ الإنهاء.
          </p>

          <h2 className="text-xl font-semibold mb-4">تغيير الشروط</h2>
          <p>
            نحتفظ بالحق في تعديل هذه الشروط في أي وقت. نشر أي تغييرات على هذه
            الصفحة يعني acceptance thereof. يجب عليك مراجعة هذه الصفحة بشكل دوري
            للاطلاع على أي تغييرات. يعد استخدامك المستمر للمنصة بعد نشر
            التغييرات acceptance من قبل التغييرات.
          </p>

          <h2 className="text-xl font-semibold mb-4">القانون الواجب التطبيق</h2>
          <p>
            تخضع هذه الشروط وتفسر وفقًا لقوانين {brand.contact.country}
            وتخضع للاختصاص القضائي المحاكم في {brand.contact.country}.
          </p>

          <h2 className="text-xl font-semibold mb-4">اتصل بنا</h2>
          <p>إذا كانت لديك أي أسئلة حول هذه الشروط، يمكنك التواصل معنا عبر:</p>
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
