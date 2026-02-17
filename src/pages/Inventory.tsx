import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, LogOut, Car, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, string> = {
  available: "זמין",
  sold: "נמכר",
  reserved: "שמור",
  in_treatment: "בטיפול",
};

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  sold: "bg-red-100 text-red-800",
  reserved: "bg-yellow-100 text-yellow-800",
  in_treatment: "bg-blue-100 text-blue-800",
};

export default function Inventory() {
  const { isAdmin, signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "הרכב נמחק בהצלחה" });
    },
    onError: (err: Error) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });

  const filtered = vehicles.filter((v) => {
    const matchSearch = !search || (v.license_plate?.includes(search) ?? false);
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground">ניהול מלאי רכבים</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{isAdmin ? "מנהל" : "איש מכירות"}</Badge>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי מספר רישוי..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="available">זמין</SelectItem>
              <SelectItem value="sold">נמכר</SelectItem>
              <SelectItem value="reserved">שמור</SelectItem>
              <SelectItem value="in_treatment">בטיפול</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => navigate("/vehicle/new")}>
              <Plus className="ml-2 h-4 w-4" />
              הוספת רכב
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">טוען נתונים...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">לא נמצאו רכבים</div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">יצרן ודגם</TableHead>
                  <TableHead className="text-right">מס׳ רישוי</TableHead>
                  <TableHead className="text-right">צבע</TableHead>
                  <TableHead className="text-right">שנה</TableHead>
                  <TableHead className="text-right">כ"ס</TableHead>
                  <TableHead className="text-right">יד</TableHead>
                  <TableHead className="text-right">ק"מ</TableHead>
                  <TableHead className="text-right">מחיר מבוקש</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${v.id}`)}>
                    <TableCell className="font-medium">{[v.manufacturer, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{v.license_plate || "—"}</TableCell>
                    <TableCell>{v.color || "—"}</TableCell>
                    <TableCell>{v.year || "—"}</TableCell>
                    <TableCell>{v.horsepower || "—"}</TableCell>
                    <TableCell>{v.hand ?? "—"}</TableCell>
                    <TableCell>{v.odometer?.toLocaleString() ?? "—"}</TableCell>
                    <TableCell>{v.asking_price ? `₪${v.asking_price.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[v.status || "available"]}`}>
                        {statusLabels[v.status || "available"]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/vehicle/${v.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(v.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
