import { fetchAll } from "@/lib/db";

// Every table a full data backup includes, and the columns worth keeping (skips internal generated columns).
const TABLES = [
  { table: "settings", columns: "shop_name,phones,email,address,gst_number,pan,bank_name,bank_account,bank_ifsc,bank_branch,upi_id,upi_payee_name,invoice_prefix,next_invoice_no,default_gst_rate,low_stock_threshold" },
  { table: "categories", columns: "id,name,created_at" },
  { table: "suppliers", columns: "id,name,phone,notes,created_at" },
  { table: "customers", columns: "id,name,phone,notes,gstin,address,state,state_code,created_at" },
  { table: "products", columns: "id,sku,name,colour,size,category_id,supplier_id,opening_stock,purchase_rate,selling_rate,gst_rate,hsn_code,manual_sort_order,is_active,created_at" },
  { table: "purchases", columns: "id,purchase_date,supplier_id,transport_charges,notes,legacy_ref,created_at" },
  { table: "purchase_items", columns: "id,purchase_id,product_id,quantity,rate,created_at" },
  { table: "sales", columns: "id,invoice_no,sale_date,customer_id,customer_name,discount_rate,gst_rate,previous_due,amount_paid,subtotal,discount_amount,gst_amount,grand_total,notes,legacy_ref,created_at" },
  { table: "sale_items", columns: "id,sale_id,position,line_date,product_id,description,quantity,rate,created_at" },
  { table: "gst_invoices", columns: "id,invoice_no,status,invoice_date,reverse_charge,supply_state,supply_state_code,transport_mode,vehicle_number,date_of_supply,place_of_supply,place_of_supply_state_code,customer_id,customer_name,customer_gstin,customer_mobile,customer_address,customer_state,customer_state_code,tax_type,cgst_rate,sgst_rate,igst_rate,taxable_amount,cgst_amount,sgst_amount,igst_amount,grand_total,amount_paid,notes,created_at" },
  { table: "gst_invoice_items", columns: "id,invoice_id,position,product_id,product_name,item_no,hsn_code,uom,quantity,rate,created_at" },
  { table: "returns", columns: "id,return_date,product_id,quantity,reason,restock,sale_id,notes,legacy_ref,created_at" },
];

// A full JSON export of everything stored in Supabase, for the owner's own safekeeping.
export async function buildFullBackup(supabase) {
  const data = {};
  for (const { table, columns } of TABLES) {
    const { data: rows } = await fetchAll(() => supabase.from(table).select(columns).order("created_at"));
    data[table] = rows ?? [];
  }
  return data;
}
