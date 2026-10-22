/**
 * يُزيل لاحقة `.html` من معرّف في المسار.
 *
 * الاستضافة الثابتة تخدم الصفحة على الرابطين: `/lesson/u02/u02l3` و
 * `/lesson/u02/u02l3.html`. والثاني هو ما يصل من رابط محفوظ أو مُشارَك أو
 * من تحديث الصفحة، فيصل المعرّف إلى expo-router وفيه اللاحقة، فلا يطابق
 * أي درس ويظهر «تعذّر العثور». نُقشّرها قبل البحث فيعمل الشكلان.
 */
export function routeId(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? '').replace(/\.html$/i, '');
}
