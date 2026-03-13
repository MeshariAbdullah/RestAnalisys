import React, { useState } from "react";
import { useLocation } from "wouter";
import { ChefHat, Shield, BarChart3, Video, CheckCircle, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

export default function Landing() {
  const [, navigate] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("admin@franchise.sa");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem("auth_token", res.token);
      localStorage.setItem("auth_user", JSON.stringify(res.user));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">نظام مراقبة الجودة</h1>
            <p className="text-xs text-blue-300">Franchise Quality Monitor</p>
          </div>
        </div>
        <Button
          onClick={() => setShowLogin(!showLogin)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          تسجيل الدخول
        </Button>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          مدعوم بالذكاء الاصطناعي - Gemini + GPT-4o
        </div>
        <h2 className="text-5xl font-bold mb-6 leading-tight">
          مراقبة جودة الفرنشايز
          <br />
          <span className="text-blue-400">بالذكاء الاصطناعي</span>
        </h2>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
          راقب الامتثال للوصفات والجودة التشغيلية عبر جميع الفروع باستخدام تحليل الفيديو المدعوم بالذكاء الاصطناعي
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
            onClick={() => setShowLogin(true)}
          >
            ابدأ الآن مجاناً
          </Button>
          <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 text-lg px-8">
            شاهد العرض التوضيحي
          </Button>
        </div>
      </section>

      {/* Login Form */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">تسجيل الدخول</h3>
                  <p className="text-sm text-slate-400">مرحباً بك في نظام المراقبة</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-slate-300">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                    placeholder="admin@franchise.sa"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">كلمة المرور</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md p-2">
                    {error}
                  </p>
                )}
                <div className="text-xs text-slate-400 bg-slate-700/50 rounded-md p-2">
                  <strong>بيانات تجريبية:</strong> admin@franchise.sa / admin123
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? "جارٍ الدخول..." : "دخول"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowLogin(false)} className="border-slate-600 text-white hover:bg-slate-700">
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">مميزات النظام</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Video,
              title: "تحليل فيديو مزدوج",
              desc: "Gemini يحلل الفيديو كاملاً، GPT-4o يحلل الإطارات - نتائج جانب بجانب مع نسبة اتفاق",
              color: "text-blue-400",
            },
            {
              icon: Shield,
              title: "امتثال الوصفات",
              desc: "تتبع المكونات، ترتيب التحضير، الحصص، والتعبئة مع درجات امتثال مفصلة",
              color: "text-green-400",
            },
            {
              icon: AlertTriangle,
              title: "تنبيهات فورية",
              desc: "تنبيهات تلقائية عند اكتشاف انتهاكات السلامة أو الجودة",
              color: "text-orange-400",
            },
            {
              icon: BarChart3,
              title: "تقارير شاملة",
              desc: "تقارير يومية وأسبوعية وشهرية مع مقاييس الأداء والاتجاهات",
              color: "text-purple-400",
            },
            {
              icon: CheckCircle,
              title: "مراقبة متعددة الفروع",
              desc: "إدارة جميع الفروع والكاميرات من منصة واحدة موحدة",
              color: "text-teal-400",
            },
            {
              icon: Star,
              title: "ذكاء اصطناعي متقدم",
              desc: "مزيج من Gemini 1.5 Pro وGPT-4o للحصول على أدق النتائج",
              color: "text-yellow-400",
            },
          ].map((feature, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-blue-600 transition-colors">
              <CardContent className="p-6">
                <feature.icon className={`w-10 h-10 mb-4 ${feature.color}`} />
                <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">الأسعار</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              name: "أساسي",
              price: "299 ريال",
              period: "شهرياً",
              features: ["5 فروع", "50 تحليل/شهر", "GPT-4o فقط", "تنبيهات أساسية"],
              highlight: false,
            },
            {
              name: "احترافي",
              price: "799 ريال",
              period: "شهرياً",
              features: ["20 فروع", "200 تحليل/شهر", "Gemini + GPT-4o", "تنبيهات متقدمة", "تقارير مفصلة"],
              highlight: true,
            },
            {
              name: "مؤسسي",
              price: "تواصل معنا",
              period: "",
              features: ["فروع غير محدودة", "تحليلات غير محدودة", "جميع الميزات", "دعم مخصص", "API مخصص"],
              highlight: false,
            },
          ].map((plan, i) => (
            <Card
              key={i}
              className={cn(
                "border-slate-700",
                plan.highlight
                  ? "bg-blue-900/40 border-blue-500 shadow-lg shadow-blue-900/20"
                  : "bg-slate-800/50"
              )}
            >
              <CardContent className="p-6">
                {plan.highlight && (
                  <div className="text-xs font-bold text-blue-300 bg-blue-900/50 rounded-full px-3 py-1 inline-block mb-3">
                    الأكثر شيوعاً
                  </div>
                )}
                <h4 className="text-xl font-bold text-white mb-1">{plan.name}</h4>
                <p className="text-3xl font-bold text-white mb-4">
                  {plan.price}
                  {plan.period && <span className="text-base font-normal text-slate-400">/{plan.period}</span>}
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    plan.highlight ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-600"
                  )}
                  onClick={() => setShowLogin(true)}
                >
                  ابدأ الآن
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <p>© 2024 نظام مراقبة جودة الفرنشايز. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
