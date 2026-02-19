import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export default function EmailConfirmation() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center animate-scale-in">
        <img src={logoImg} alt="לוגו" className="h-16 w-auto object-contain mx-auto mb-8" />
        
        <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-3xl font-polin-medium text-foreground mb-3">בדוק את תיבת המייל</h1>
        <p className="text-muted-foreground font-polin-light text-lg leading-relaxed mb-2">
          שלחנו לך מייל עם קישור לאישור החשבון.
        </p>
        <p className="text-muted-foreground font-polin-light text-sm mb-8">
          לא קיבלת? בדוק בתיקיית הספאם או נסה להירשם שוב.
        </p>

        <Button
          variant="outline"
          className="font-polin-medium"
          onClick={() => navigate("/auth")}
        >
          חזרה להתחברות
        </Button>
      </div>
    </div>
  );
}
