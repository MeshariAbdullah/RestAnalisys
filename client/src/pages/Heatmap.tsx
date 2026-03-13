import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Map, Construction } from "lucide-react";

export default function Heatmap() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">خريطة الحرارة</h1>
      <p className="text-muted-foreground text-sm mb-6">توزيع جغرافي للفروع والجودة</p>
      <Card className="p-16 text-center">
        <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold mb-2">قيد التطوير</h2>
        <p className="text-muted-foreground">
          سيتم إضافة خريطة الحرارة قريباً، تشمل: التوزيع الجغرافي للفروع، مستويات الجودة حسب المنطقة، ونقاط الخطر.
        </p>
      </Card>
    </div>
  );
}
