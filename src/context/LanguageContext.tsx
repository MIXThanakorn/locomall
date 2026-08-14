import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "th";

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Tabs
    home: "Home",
    notification: "Notification",
    chat: "Chat",
    profile: "Me",
    
    // Auth
    signIn: "SIGN IN",
    signUp: "SIGN UP",
    welcome: "Welcome to Locomall",
    recoverPassword: "Recover Password",
    enterOtp: "Enter OTP",
    newPassword: "Create new password",
    passwordChanged: "Password Changed",

    // Home
    searchPlaceholder: "Search market products...",
    selectedCollections: "SELECTED COLLECTIONS",
    allGoods: "All Goods",
    organicGrains: "Organic Grains",
    localFarm: "Local Farm",
    handcrafted: "Handcrafted",
    featuredMarkets: "FEATURED COMMUNITY MARKETS",
    viewAll: "View All",
    popularProducts: "POPULAR MARKET PRODUCTS",
    addToCart: "Add to Cart",
    buyNow: "Buy",
    sellersParticipating: "Sellers participating",

    // Profile & Settings
    myProfile: "My Profile",
    accountSetting: "Account Setting",
    changePassword: "Change Password",
    myOrders: "My Orders",
    shippingAddress: "Shipping Address",
    wallet: "Bank Account / Cards / Wallet",
    notificationSettings: "Notification Settings",
    language: "Language",
    aboutUs: "About Us",
    signOut: "Sign Out",
    sellerDashboard: "Seller Dashboard",
    marketOwnerPortal: "Market Owner Portal",
    toPay: "To Pay",
    toShip: "To Ship",
    toReceive: "To Receive",
    reviews: "Reviews",

    // Language Screen
    selectLanguage: "Language",
    suggestedLanguages: "SUGGESTED",
    saveLanguage: "Apply Language",
    langChangedSuccess: "Language changed successfully to English",
  },
  th: {
    // Navigation & Tabs
    home: "หน้าแรก",
    notification: "การแจ้งเตือน",
    chat: "แชท",
    profile: "โปรไฟล์",

    // Auth
    signIn: "เข้าสู่ระบบ",
    signUp: "สมัครสมาชิก",
    welcome: "ยินดีต้อนรับสู่ Locomall",
    recoverPassword: "กู้คืนรหัสผ่าน",
    enterOtp: "กรอกรหัส OTP",
    newPassword: "ตั้งรหัสผ่านใหม่",
    passwordChanged: "เปลี่ยนรหัสผ่านสำเร็จ",

    // Home
    searchPlaceholder: "ค้นหาสินค้าในตลาดชุมชน...",
    selectedCollections: "หมวดหมู่คัดสรร",
    allGoods: "สินค้าทั้งหมด",
    organicGrains: "ธัญพืชออร์แกนิก",
    localFarm: "ผลผลิตชุมชน",
    handcrafted: "งานฝีมือท้องถิ่น",
    featuredMarkets: "ตลาดชุมชนแนะนำ",
    viewAll: "ดูทั้งหมด",
    popularProducts: "สินค้ายอดนิยมในตลาด",
    addToCart: "เพิ่มลงตะกร้า",
    buyNow: "ซื้อเลย",
    sellersParticipating: "ร้านค้าร่วมส่งสินค้า",

    // Profile & Settings
    myProfile: "โปรไฟล์ของฉัน",
    accountSetting: "ตั้งค่าบัญชี",
    changePassword: "เปลี่ยนรหัสผ่าน",
    myOrders: "คำสั่งซื้อของฉัน",
    shippingAddress: "ที่อยู่สำหรับจัดส่ง",
    wallet: "บัญชีธนาคาร / บัตร / กระเป๋าเงิน",
    notificationSettings: "ตั้งค่าการแจ้งเตือน",
    language: "ภาษา (Language)",
    aboutUs: "เกี่ยวกับเรา",
    signOut: "ออกจากระบบ",
    sellerDashboard: "แดชบอร์ดผู้ขาย",
    marketOwnerPortal: "แดชบอร์ดเจ้าของตลาด",
    toPay: "ที่ต้องชำระ",
    toShip: "ที่ต้องจัดส่ง",
    toReceive: "ที่ต้องได้รับ",
    reviews: "รีวิว",

    // Language Screen
    selectLanguage: "เปลี่ยนภาษา",
    suggestedLanguages: "ภาษาแนะนำ",
    saveLanguage: "บันทึกการเปลี่ยนภาษา",
    langChangedSuccess: "เปลี่ยนภาษาเป็นภาษาไทยเรียบร้อยแล้ว",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
