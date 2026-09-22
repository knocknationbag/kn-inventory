import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { exportHref } from "@/lib/reports/exports";

// Plain download links (no JavaScript needed). CSV opens in Excel/Sheets; JSON is for other tools.
export default function ExportButtons({ report, filters = {} }) {
  return (
    <>
      <a href={exportHref(report, filters, "csv")} download className={buttonClass({ variant: "outline", size: "sm" })}>
        <Icon name="download" size={16} />
        CSV
      </a>
      <a href={exportHref(report, filters, "json")} download className={buttonClass({ variant: "ghost", size: "sm" })}>
        JSON
      </a>
    </>
  );
}
