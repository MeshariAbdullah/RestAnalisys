import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Construction } from "lucide-react";

export default function Employees() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">الموظفون</h1>
      <p className="text-muted-foreground text-sm mb-6">إدارة بيانات الموظفين وأدائهم</p>
      <Card className="p-16 text-center">
        <Construction className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold mb-2">قيد التطوير</h2>
        <p className="text-muted-foreground">
          سيتم إضافة إدارة الموظفون قريباً، تشمل: بيانات الموظفين، الأداء، الجداول الزمنية، وتقارير الامتثال الفردية.
        </p>
      </Card>
    </div>
  );
}
