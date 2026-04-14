import { db } from "./index.js";
import {
  stores,
  storeCameras,
  recipes,
  recipeSpecs,
  users,
  employees,
  employeePerformance,
} from "./schema.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create demo stores
  const [store1, store2, store3] = await db
    .insert(stores)
    .values([
      {
        name: "فرع الرياض الرئيسي",
        type: "restaurant",
        city: "الرياض",
        cameras: 4,
        latitude: 24.7136,
        longitude: 46.6753,
        address: "شارع الملك فهد، الرياض",
      },
      {
        name: "فرع جدة",
        type: "restaurant",
        city: "جدة",
        cameras: 3,
        latitude: 21.4858,
        longitude: 39.1925,
        address: "طريق الأمير سلطان، جدة",
      },
      {
        name: "فرع الدمام",
        type: "kitchen",
        city: "الدمام",
        cameras: 2,
        latitude: 26.4207,
        longitude: 50.0888,
        address: "شارع الخليج، الدمام",
      },
    ])
    .returning();

  // Create cameras
  await db.insert(storeCameras).values([
    { storeId: store1.id, name: "كاميرا المطبخ الرئيسي", location: "kitchen_main", status: "active" },
    { storeId: store1.id, name: "كاميرا التجهيز", location: "prep_station", status: "active" },
    { storeId: store2.id, name: "كاميرا المطبخ", location: "kitchen_main", status: "active" },
    { storeId: store3.id, name: "كاميرا الإنتاج", location: "production", status: "active" },
  ]);

  // Create sample recipe
  const [recipe1] = await db
    .insert(recipes)
    .values([
      { storeId: null, name: "برجر الكلاسيكي", version: "2.0", isActive: true },
      { storeId: null, name: "بيتزا مارغريتا", version: "1.5", isActive: true },
      { storeId: store1.id, name: "شاورما الدجاج الخاصة", version: "1.0", isActive: true },
    ])
    .returning();

  // Recipe spec for Classic Burger
  await db.insert(recipeSpecs).values({
    recipeId: recipe1.id,
    specJson: {
      requiredIngredients: ["خبز البرجر", "لحم البقر", "جبنة", "خس", "طماطم", "بصل", "صلصة خاصة"],
      assemblyOrder: ["خبز سفلي", "صلصة", "لحم", "جبنة", "خس", "طماطم", "بصل", "خبز علوي"],
      portionConstraints: {
        meat: { min: 150, max: 180, unit: "g" },
        cheese: { min: 1, max: 2, unit: "slices" },
      },
      presentationRules: ["يجب لف البرجر في ورق التغليف", "يجب وضعه في الصندوق المخصص"],
      foodSafetyRules: ["يجب ارتداء القفازات أثناء التحضير", "يجب ارتداء غطاء الرأس"],
      complianceThreshold: 75,
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@franchise.sa",
    passwordHash,
    name: "مدير النظام",
    role: "admin",
  });

  // Seed employees
  const employeeRows = await db
    .insert(employees)
    .values([
      { storeId: store1.id, name: "أحمد العبدالله", role: "chef", shift: "morning", phone: "0550000001", email: "ahmed@franchise.sa", status: "active" },
      { storeId: store1.id, name: "سعود الغامدي", role: "cashier", shift: "evening", phone: "0550000002", status: "active" },
      { storeId: store1.id, name: "عبدالرحمن المطيري", role: "prep", shift: "morning", status: "active" },
      { storeId: store2.id, name: "خالد الشهري", role: "manager", shift: "morning", phone: "0550000003", email: "khalid@franchise.sa", status: "active" },
      { storeId: store2.id, name: "ماجد الحربي", role: "chef", shift: "evening", status: "active" },
      { storeId: store3.id, name: "فيصل القحطاني", role: "chef", shift: "night", status: "active" },
      { storeId: store3.id, name: "تركي الزهراني", role: "prep", shift: "morning", status: "on_leave" },
    ])
    .returning();

  // Seed performance entries (demo)
  const perfValues = employeeRows.flatMap((emp, i) => [
    {
      employeeId: emp.id,
      complianceScore: 65 + ((i * 7) % 30),
      safetyScore: 70 + ((i * 5) % 25),
      hygieneScore: 75 + ((i * 3) % 20),
      violations: i % 3,
      notes: "تقييم تلقائي أولي",
    },
    {
      employeeId: emp.id,
      complianceScore: 70 + ((i * 9) % 25),
      safetyScore: 80 + ((i * 4) % 15),
      hygieneScore: 78 + ((i * 6) % 20),
      violations: (i + 1) % 4,
      notes: null,
    },
  ]);
  await db.insert(employeePerformance).values(perfValues);

  console.log("Seeding completed!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
