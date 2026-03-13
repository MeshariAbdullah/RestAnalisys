import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipesApi, storesApi } from "@/lib/api";
import type { Recipe, RecipeSpec } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Trash2, Edit, Save, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";

const DEFAULT_SPEC: RecipeSpec = {
  requiredIngredients: ["مكون 1", "مكون 2"],
  assemblyOrder: ["خطوة 1", "خطوة 2"],
  portionConstraints: {
    "المكون الرئيسي": { min: 100, max: 150, unit: "g" },
  },
  presentationRules: ["قاعدة تقديم 1"],
  foodSafetyRules: ["ارتداء القفازات", "ارتداء غطاء الرأس"],
  complianceThreshold: 75,
};

function RecipeCard({ recipe, onEdit, onDelete }: { recipe: Recipe; onEdit: () => void; onDelete: () => void }) {
  const spec = (recipe.specJson ?? recipe.spec?.specJson) as RecipeSpec | undefined;
  return (
    <Card className="hover:border-blue-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground">الإصدار {recipe.version}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={recipe.isActive ? "success" : "secondary"}>
              {recipe.isActive ? "نشط" : "غير نشط"}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {spec && (
          <div className="space-y-2 text-xs">
            {spec.requiredIngredients && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">المكونات:</span>
                <div className="flex flex-wrap gap-1">
                  {spec.requiredIngredients.slice(0, 5).map((ing, i) => (
                    <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{ing}</span>
                  ))}
                  {spec.requiredIngredients.length > 5 && (
                    <span className="text-muted-foreground">+{spec.requiredIngredients.length - 5}</span>
                  )}
                </div>
              </div>
            )}
            {spec.complianceThreshold && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">حد الامتثال:</span>
                <span className="font-medium">{spec.complianceThreshold}%</span>
              </div>
            )}
            {spec.foodSafetyRules && spec.foodSafetyRules.length > 0 && (
              <div className="flex items-center gap-1 text-green-700">
                <CheckCircle className="w-3 h-3" />
                <span>{spec.foodSafetyRules.length} قاعدة سلامة</span>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">{formatDate(recipe.createdAt)}</p>
      </CardContent>
    </Card>
  );
}

function RecipeEditor({
  recipe,
  onSave,
  onCancel,
}: {
  recipe?: Recipe;
  onSave: (data: Partial<Recipe> & { specJson?: RecipeSpec }) => void;
  onCancel: () => void;
}) {
  const { data: stores } = useQuery({ queryKey: ["stores"], queryFn: storesApi.list });

  const [name, setName] = useState(recipe?.name ?? "");
  const [version, setVersion] = useState(recipe?.version ?? "1.0");
  const [storeId, setStoreId] = useState(recipe?.storeId ? String(recipe.storeId) : "");
  const [isActive, setIsActive] = useState(recipe?.isActive ?? true);
  const [specRaw, setSpecRaw] = useState(
    JSON.stringify((recipe?.specJson ?? recipe?.spec?.specJson) ?? DEFAULT_SPEC, null, 2)
  );
  const [specError, setSpecError] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Parsed spec for visual editing
  const [spec, setSpec] = useState<RecipeSpec>(
    (recipe?.specJson ?? recipe?.spec?.specJson) ?? DEFAULT_SPEC
  );
  const [useVisualEditor, setUseVisualEditor] = useState(true);

  function updateSpec(updater: (s: RecipeSpec) => RecipeSpec) {
    const newSpec = updater(spec);
    setSpec(newSpec);
    setSpecRaw(JSON.stringify(newSpec, null, 2));
  }

  function handleJsonChange(val: string) {
    setSpecRaw(val);
    try {
      const parsed = JSON.parse(val);
      setSpec(parsed);
      setSpecError("");
    } catch {
      setSpecError("صيغة JSON غير صحيحة");
    }
  }

  function handleSave() {
    try {
      const parsedSpec = JSON.parse(specRaw);
      onSave({
        name,
        version,
        storeId: storeId ? parseInt(storeId) : null,
        isActive,
        specJson: parsedSpec,
      });
    } catch {
      setSpecError("يرجى إصلاح أخطاء JSON قبل الحفظ");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{recipe ? "تعديل الوصفة" : "وصفة جديدة"}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 ml-1" />حفظ</Button>
            <Button size="sm" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-1" />إلغاء</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
            <TabsTrigger value="spec">مواصفات الوصفة</TabsTrigger>
            <TabsTrigger value="json">JSON المتقدم</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم الوصفة *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="برجر الكلاسيكي" />
              </div>
              <div>
                <Label>الإصدار</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1" placeholder="1.0" />
              </div>
            </div>
            <div>
              <Label>الفرع (اختياري - تركه فارغاً للعموم)</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="وصفة عامة لجميع الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">عام - جميع الفروع</SelectItem>
                  {stores?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>حد الامتثال (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={spec.complianceThreshold ?? 75}
                onChange={(e) => updateSpec((s) => ({ ...s, complianceThreshold: parseInt(e.target.value) }))}
                className="mt-1 w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">سيتم إنشاء تنبيه عند انخفاض الدرجة عن هذه القيمة</p>
            </div>
          </TabsContent>

          <TabsContent value="spec" className="space-y-6">
            {/* Required Ingredients */}
            <div>
              <Label className="text-sm font-semibold">المكونات المطلوبة</Label>
              <p className="text-xs text-muted-foreground mb-2">المكونات التي يجب أن تكون مرئية في الفيديو</p>
              <div className="space-y-2">
                {spec.requiredIngredients?.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={ing}
                      onChange={(e) => {
                        const newIngs = [...(spec.requiredIngredients ?? [])];
                        newIngs[i] = e.target.value;
                        updateSpec((s) => ({ ...s, requiredIngredients: newIngs }));
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => updateSpec((s) => ({
                        ...s,
                        requiredIngredients: s.requiredIngredients?.filter((_, j) => j !== i),
                      }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSpec((s) => ({
                    ...s,
                    requiredIngredients: [...(s.requiredIngredients ?? []), "مكون جديد"],
                  }))}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة مكون
                </Button>
              </div>
            </div>

            {/* Assembly Order */}
            <div>
              <Label className="text-sm font-semibold">ترتيب التحضير</Label>
              <p className="text-xs text-muted-foreground mb-2">الترتيب المتوقع لخطوات التحضير</p>
              <div className="space-y-2">
                {spec.assemblyOrder?.map((step, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                    <Input
                      value={step}
                      onChange={(e) => {
                        const newSteps = [...(spec.assemblyOrder ?? [])];
                        newSteps[i] = e.target.value;
                        updateSpec((s) => ({ ...s, assemblyOrder: newSteps }));
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => updateSpec((s) => ({
                        ...s,
                        assemblyOrder: s.assemblyOrder?.filter((_, j) => j !== i),
                      }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSpec((s) => ({
                    ...s,
                    assemblyOrder: [...(s.assemblyOrder ?? []), "خطوة جديدة"],
                  }))}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة خطوة
                </Button>
              </div>
            </div>

            {/* Safety Rules */}
            <div>
              <Label className="text-sm font-semibold">قواعد السلامة الغذائية</Label>
              <p className="text-xs text-muted-foreground mb-2">متطلبات السلامة التي يجب مراعاتها</p>
              <div className="space-y-2">
                {spec.foodSafetyRules?.map((rule, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={rule}
                      onChange={(e) => {
                        const newRules = [...(spec.foodSafetyRules ?? [])];
                        newRules[i] = e.target.value;
                        updateSpec((s) => ({ ...s, foodSafetyRules: newRules }));
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => updateSpec((s) => ({
                        ...s,
                        foodSafetyRules: s.foodSafetyRules?.filter((_, j) => j !== i),
                      }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSpec((s) => ({
                    ...s,
                    foodSafetyRules: [...(s.foodSafetyRules ?? []), "قاعدة جديدة"],
                  }))}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة قاعدة
                </Button>
              </div>
            </div>

            {/* Presentation Rules */}
            <div>
              <Label className="text-sm font-semibold">قواعد التقديم والتعبئة</Label>
              <div className="space-y-2 mt-2">
                {spec.presentationRules?.map((rule, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={rule}
                      onChange={(e) => {
                        const newRules = [...(spec.presentationRules ?? [])];
                        newRules[i] = e.target.value;
                        updateSpec((s) => ({ ...s, presentationRules: newRules }));
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => updateSpec((s) => ({
                        ...s,
                        presentationRules: s.presentationRules?.filter((_, j) => j !== i),
                      }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSpec((s) => ({
                    ...s,
                    presentationRules: [...(s.presentationRules ?? []), "قاعدة جديدة"],
                  }))}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة قاعدة
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm font-semibold">محرر JSON المتقدم</Label>
                {specError && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {specError}
                  </span>
                )}
                {!specError && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />JSON صحيح</span>}
              </div>
              <Textarea
                value={specRaw}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="font-mono text-xs min-h-[400px] ltr"
                dir="ltr"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function Recipes() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Recipe | null | "new">(null);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: recipesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: recipesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof recipesApi.update>[1] }) =>
      recipesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: recipesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الوصفات</h1>
          <p className="text-muted-foreground text-sm">إنشاء وتعديل وصفات المطعم مع مواصفات الجودة</p>
        </div>
        <Button onClick={() => setEditing("new")} disabled={!!editing}>
          <Plus className="w-4 h-4 ml-2" />
          وصفة جديدة
        </Button>
      </div>

      {editing && (
        <RecipeEditor
          recipe={editing !== "new" ? editing : undefined}
          onSave={(data) => {
            if (editing === "new") {
              createMutation.mutate(data);
            } else {
              updateMutation.mutate({ id: editing.id, data });
            }
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جارٍ التحميل...</div>
      ) : !recipes?.length ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">لا توجد وصفات بعد</p>
          <Button onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة أول وصفة
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={() => setEditing(recipe)}
              onDelete={() => {
                if (confirm(`هل تريد حذف وصفة "${recipe.name}"؟`)) {
                  deleteMutation.mutate(recipe.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
