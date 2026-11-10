import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "../shared/ui";
import { t as tr, useLanguage } from "../shared/i18n";
import "./MobileBack.css";

export function MobileBack({ fallback, className = "mobile-workspace-back" }: { fallback: string; className?: string }) {
  useLanguage();
  const navigate = useNavigate();
  return <IconButton className={className} icon={ArrowLeft} label={tr("Back")}
    onClick={() => { if (Number(window.history.state?.idx ?? 0) > 0) navigate(-1); else navigate(fallback, { replace: true }); }} />;
}
