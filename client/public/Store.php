<?php
/**
 * ALHUSAINIA — Storefront embed (for WordPress / any PHP host)
 * ============================================================
 * 1. Upload this file to your website root (e.g. /Store.php)
 * 2. Replace STORE_URL below with the platform's public address
 * 3. Open https://your-site.com/Store.php
 *
 * For a full-page storefront instead of an iframe, link directly to STORE_URL.
 * WP users: paste the iframe below into a page via the "Custom HTML" block.
 */
$STORE_URL = "https://alhusainiaye.vercel.app/store"; // CHANGE ME
header("Content-Type: text/html; charset=UTF-8");
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#0e2a2b"/>
<meta name="description" content="متجر الحسينية الإلكتروني — كتالوج الخدمات والمنتجات مدعوم بمنظومة الأعمال الموحّدة."/>
<title>متجر الحسينية الإلكتروني</title>
<style>
  html,body{margin:0;height:100%;background:#fbf8f2;font-family:"Segoe UI",Tahoma,Arial,sans-serif}
  iframe{width:100%;height:100%;border:0;display:block}
</style>
</head>
<body>
<iframe src="<?php echo htmlspecialchars($STORE_URL, ENT_QUOTES, "UTF-8"); ?>" title="متجر الحسينية" allow="geolocation"></iframe>
</body>
</html>
