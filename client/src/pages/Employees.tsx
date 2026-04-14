import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi, storesApi } from "@/lib/api";
import type { Employee } from "@/lib/api";
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
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Award,
  AlertTriangle,
  Phone,
  Mail,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatScore, getScoreColor } from "@/lib/utils";

type EmployeeForm = {
  id?: number;
  storeId: number | null;
  name: string;
  role: string;
  shift: string;
  phone: string;
  email: string;
  status: "active" | "on_leave" | "terminated";
  notes: string;
};

const EMPTY_FORM: EmployeeForm = {
  storeId: null,
  name: "",
  role: "staff",
  shift: "morning",
  phone: "",
  email: "",
  status: "active",
  notes: "",
};

const ROLE_LABELS: Record<string, string> = {
  manager: "مدير",
  chef: "طاهي",
  cashier: "كاشير",
  prep: "تحضير",
  staff: "موظف",
  delivery: "توصيل",
};

const SHIFT_LABELS: Record<string, string> = {
  morning: "صباحية",
  evening: "مسائية",
  night: "ليلية",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  on_leave: "إجازة",
  terminated: "منتهي",
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  on_leave: "warning",
  terminated: "destructive",
};

function EmployeeCard({
  employee,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:border-blue-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold shrink-0">
              {employee.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{employee.name}</h3>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[employee.role] ?? employee.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={STATUS_VARIANTS[employee.status]}>
              {STATUS_LABELS[employee.status]}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          {employee.storeName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>{employee.storeName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>وردية {SHIFT_LABELS[employee.shift] ?? employee.shift}</span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span dir="ltr">{employee.phone}</span>
            </div>
          )}
          {employee.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{employee.email}</span>
            </div>
          )}
          <div className="pt-2 text-[11px] text-muted-foreground">
            انضم في {formatDate(employee.hireDate)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeForm({
  form,
  setForm,
  onSave,
  onCancel,
  stores,
  saving,
}: {
  form: EmployeeForm;
  setForm: (f: EmployeeForm) => void;
  onSave: () => void;
  onCancel: () => void;
  stores?: { id: number; name: string }[];
  saving: boolean;
}) {
  const isEdit = !!form.id;
  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          {isEdit ? "تعديل موظف" : "إضافة موظف جديد"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>الاسم *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="محمد عبدالله"
            />
          </div>
          <div className="space-y-2">
            <Label>الفرع *</Label>
            <Select
              value={form.storeId ? String(form.storeId) : ""}
              onValueChange={(v) => setForm({ ...form, storeId: v ? parseInt(v) : null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الدور</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الوردية</Label>
            <Select
              value={form.shift}
              onValueChange={(v) => setForm({ ...form, shift: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SHIFT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الهاتف</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              dir="ltr"
              placeholder="05xxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              dir="ltr"
              placeholder="name@franchise.sa"
            />
          </div>
          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as EmployeeForm["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>ملاحظات</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 ml-2" />
            إلغاء
          </Button>
          <Button onClick={onSave} disabled={saving || !form.name || !form.storeId}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Employees() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [filterStore, setFilterStore] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");

  const { data: stores } = useQuery({ queryKey: ["stores"], queryFn: storesApi.list });
  const { data: stats } = useQuery({
    queryKey: ["employee-stats"],
    queryFn: employeesApi.stats,
    refetchInterval: 30_000,
  });
  const { data: leaderboard } = useQuery({
    queryKey: ["employee-leaderboard"],
    queryFn: employeesApi.leaderboard,
  });
  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ["employees", filterStore, filterStatus, filterShift],
    queryFn: () =>
      employeesApi.list({
        storeId: filterStore ? parseInt(filterStore) : undefined,
        status: filterStatus || undefined,
        shift: filterShift || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: async (f: EmployeeForm) => {
      const payload = {
        storeId: f.storeId!,
        name: f.name,
        role: f.role,
        shift: f.shift,
        phone: f.phone || null,
        email: f.email || null,
        status: f.status,
        notes: f.notes || null,
      };
      if (f.id) return employeesApi.update(f.id, payload as Partial<Employee>);
      return employeesApi.create(payload as Partial<Employee>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
      queryClient.invalidateQueries({ queryKey: ["employee-leaderboard"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
    },
  });

  function startEdit(emp: Employee) {
    setForm({
      id: emp.id,
      storeId: emp.storeId,
      name: emp.name,
      role: emp.role,
      shift: emp.shift,
      phone: emp.phone ?? "",
      email: emp.email ?? "",
      status: emp.status,
      notes: emp.notes ?? "",
    });
    setShowForm(true);
  }

  function startCreate() {
    setForm({ ...EMPTY_FORM, storeId: stores?.[0]?.id ?? null });
    setShowForm(true);
  }

  function handleDelete(emp: Employee) {
    if (confirm(`هل أنت متأكد من حذف ${emp.name}؟`)) {
      deleteMutation.mutate(emp.id);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">الموظفون</h1>
          <p className="text-muted-foreground text-sm">
            إدارة بيانات الموظفين وأدائهم وتقييم الامتثال الفردي
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={startCreate}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة موظف
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">نشط</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجازة</p>
                  <p className="text-2xl font-bold">{stats.onLeave}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">متوسط الامتثال</p>
                  <p
                    className={`text-2xl font-bold ${stats.avgComplianceScore !== null ? getScoreColor(stats.avgComplianceScore) : ""}`}
                  >
                    {stats.avgComplianceScore !== null
                      ? formatScore(stats.avgComplianceScore)
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مخالفات</p>
                  <p className="text-2xl font-bold">{stats.totalViolations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <EmployeeForm
          form={form}
          setForm={setForm}
          onSave={() => saveMutation.mutate(form)}
          onCancel={() => {
            setShowForm(false);
            setForm(EMPTY_FORM);
          }}
          stores={stores}
          saving={saveMutation.isPending}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters + List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={filterStore} onValueChange={setFilterStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الفروع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الفروع</SelectItem>
                    {stores?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الحالات</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterShift} onValueChange={setFilterShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الورديات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الورديات</SelectItem>
                    {Object.entries(SHIFT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جارٍ التحميل...</div>
          ) : !employees?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">لا يوجد موظفون مطابقون للفلاتر</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onEdit={() => startEdit(emp)}
                  onDelete={() => handleDelete(emp)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="w-5 h-5 text-yellow-500" />
                أفضل 10 موظفين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!leaderboard?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد بيانات تقييم بعد
                </p>
              ) : (
                leaderboard.map((entry, i) => (
                  <div
                    key={entry.employeeId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                            ? "bg-gray-100 text-gray-700"
                            : i === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ROLE_LABELS[entry.role] ?? entry.role}
                        {entry.storeName ? ` • ${entry.storeName}` : ""}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p
                        className={`text-sm font-bold ${getScoreColor(Number(entry.avgScore))}`}
                      >
                        {formatScore(Number(entry.avgScore))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.evaluations} تقييم
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
