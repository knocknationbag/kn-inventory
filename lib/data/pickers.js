// Products offered in the product selector: every active product, plus any already used on the record being edited.
export async function getPickerProducts(supabase, extraIds = []) {
  const columns = "id, sku, name, colour, size, current_stock, purchase_rate, selling_rate, gst_rate, is_active";
  const { data: active } = await supabase.from("product_overview").select(columns).eq("is_active", true).order("sku").limit(3000);
  const products = active ?? [];

  const missing = extraIds.filter((id) => !products.some((p) => p.id === id));
  if (missing.length) {
    const { data: extra } = await supabase.from("product_overview").select(columns).in("id", missing);
    products.push(...(extra ?? []));
  }
  return products;
}
