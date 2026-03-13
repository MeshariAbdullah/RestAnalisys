import { db } from "./index.js";
import { stores, storeCameras, recipes, recipeSpecs, users } from "./schema.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create demo stores
  const [store1, store2, store3] = await db
    .insert(stores)
    .values([
      { name: "فرع الرياض الرئيسي", type: "restaurant", city: "الرياض", cameras: 4 },
      { name: "فرع جدة", type: "restaurant", city: "جدة", cameras: 3 },
      { name: "فرع الدمام", type: "kitchen", city: "الدمام", cameras: 2 },
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

  console.log("Seeding completed!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
