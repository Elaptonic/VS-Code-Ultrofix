import { Icon } from "@/components/Icon";
import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const SERVICE_CATEGORIES = [
  { id: "cleaning", label: "Cleaning", icon: "wind" },
  { id: "plumbing", label: "Plumbing", icon: "droplet" },
  { id: "electrical", label: "Electrical", icon: "zap" },
  { id: "carpentry", label: "Carpentry", icon: "tool" },
  { id: "painting", label: "Painting", icon: "edit-3" },
  { id: "pest", label: "Pest Control", icon: "shield" },
  { id: "appliances", label: "Appliance Repair", icon: "cpu" },
  { id: "salon-women", label: "Salon for Women", icon: "scissors" },
  { id: "salon-men", label: "Salon for Men", icon: "user" },
  { id: "massage", label: "Massage & Spa", icon: "heart" },
  { id: "water-purifier", label: "Water Purifier", icon: "droplet" },
] as const;

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  cleaning: ["Deep Cleaning", "Bathroom Cleaning", "Kitchen Cleaning", "Sofa Cleaning", "Carpet Cleaning"],
  plumbing: ["Pipe Repair", "Tap Fixing", "Drain Unblocking", "Geyser Repair", "Toilet Repair"],
  electrical: ["Wiring", "Fan Installation", "Switch Repair", "MCB Fitting", "Light Installation"],
  carpentry: ["Furniture Assembly", "Door Repair", "Wardrobe Installation", "Bed Repair", "Wood Polish"],
  painting: ["Wall Painting", "Texture Painting", "Waterproofing", "Exterior Painting", "Whitewash"],
  pest: ["Cockroach Treatment", "Termite Treatment", "Rodent Control", "Bed Bug Treatment", "Mosquito Spray"],
  appliances: ["AC Repair", "Washing Machine", "Refrigerator", "Microwave Repair", "TV Repair"],
  "salon-women": ["Haircut & Styling", "Facial", "Waxing", "Bridal Makeup", "Hair Color"],
  "salon-men": ["Haircut", "Beard Grooming", "Facial", "Head Massage", "Hair Color"],
  massage: ["Swedish Massage", "Deep Tissue", "Foot Reflexology", "Head Massage", "Couple Massage"],
  "water-purifier": ["RO Installation", "RO Repair", "Filter Change", "UV Purifier Service", "Water Softener"],
};

const CITY_SUGGESTIONS = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
];

const EXPERIENCE_OPTIONS = ["Less than 1 year", "1–2 years", "3–5 years", "5–10 years", "10+ years"];

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  name: string;
  bio: string;
  category: string;
  specializations: string[];
  experience: string;
  serviceAreas: string[];
  hourlyRate: string;
  idDocumentUrl: string;
}

const STEPS = [
  { label: "Personal", icon: "user" },
  { label: "Services", icon: "tool" },
  { label: "Area", icon: "map-pin" },
  { label: "Pricing", icon: "dollar-sign" },
  { label: "Verify", icon: "shield" },
] as const;

export default function ProviderOnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, refreshUser, markOnboardingComplete } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState<FormData>({
    name: user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}` : "",
    bio: "",
    category: "",
    specializations: [],
    experience: "",
    serviceAreas: [],
    hourlyRate: "",
    idDocumentUrl: "",
  });

  const animateStep = (next: Step) => {
    const dir = next > step ? 1 : -1;
    slideAnim.setValue(dir * 60);
    setStep(next);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleSkill = (skill: string) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(skill)
        ? f.specializations.filter((s) => s !== skill)
        : [...f.specializations, skill],
    }));
  };

  const toggleArea = (area: string) => {
    setForm((f) => ({
      ...f,
      serviceAreas: f.serviceAreas.includes(area)
        ? f.serviceAreas.filter((a) => a !== area)
        : [...f.serviceAreas, area],
    }));
  };

  const pickDocument = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your photo library to upload an ID document.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled && result.assets[0]) {
        setUploadingDoc(true);
        const asset = result.assets[0];
        const ext = asset.uri.split(".").pop() ?? "jpg";
        const fileName = `id_${user?.id ?? "doc"}_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: fileName,
          type: `image/${ext}`,
        } as any);

        const uploadRes = await fetch(`${BASE_URL}/api/upload/document`, {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
          credentials: "include",
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          setField("idDocumentUrl", url);
        } else {
          setField("idDocumentUrl", asset.uri);
        }
        setUploadingDoc(false);
      }
    } catch {
      setUploadingDoc(false);
      setField("idDocumentUrl", `local://doc_${Date.now()}`);
    }
  };

  const canNext = (): boolean => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return !!form.category && form.specializations.length > 0 && !!form.experience;
    if (step === 3) return form.serviceAreas.length > 0;
    if (step === 4) return !!form.hourlyRate && Number(form.hourlyRate) > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/onboarding/provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          bio: form.bio.trim(),
          category: form.category,
          specializations: form.specializations,
          experience: form.experience,
          serviceAreas: form.serviceAreas,
          hourlyRate: Number(form.hourlyRate) || 0,
          idDocumentUrl: form.idDocumentUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save profile");
      }

      markOnboardingComplete();
      await refreshUser();
      router.replace("/vendor/(tabs)/dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ProgressHeader step={step} colors={colors} onBack={step > 1 ? () => animateStep((step - 1) as Step) : undefined} />

      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && <Step1 form={form} setField={setField} colors={colors} />}
          {step === 2 && <Step2 form={form} setField={setField} toggleSkill={toggleSkill} colors={colors} />}
          {step === 3 && <Step3 form={form} toggleArea={toggleArea} colors={colors} />}
          {step === 4 && <Step4 form={form} setField={setField} colors={colors} />}
          {step === 5 && (
            <Step5
              form={form}
              colors={colors}
              pickDocument={pickDocument}
              uploadingDoc={uploadingDoc}
            />
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {step < 5 ? (
          <Pressable
            style={[styles.btn, { backgroundColor: canNext() ? colors.primary : colors.muted }, !canNext() && styles.btnDisabled]}
            onPress={() => canNext() && animateStep((step + 1) as Step)}
            disabled={!canNext()}
          >
            <Text style={[styles.btnText, { color: canNext() ? "#fff" : colors.mutedForeground }]}>Continue</Text>
            <Icon name="arrow-right" size={18} color={canNext() ? "#fff" : colors.mutedForeground} />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.btnText, { color: "#fff" }]}>Submit & Go Live</Text>
                <Icon name="check-circle" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        )}

        {step < 5 && (
          <Pressable style={styles.skipBtn} onPress={() => animateStep((step + 1) as Step)}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

async function getToken(): Promise<string | null> {
  try {
    const mod = await import("expo-secure-store");
    return await mod.getItemAsync("auth_session_token");
  } catch {
    return null;
  }
}

function ProgressHeader({
  step,
  colors,
  onBack,
}: {
  step: Step;
  colors: ReturnType<typeof useColors>;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {STEPS[step - 1].label}
        </Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {step}/5
        </Text>
      </View>

      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              {
                backgroundColor: i < step ? colors.primary : colors.muted,
                flex: 1,
                marginHorizontal: 2,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function Step1({
  form,
  setField,
  colors,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepWrap}>
      <StepHero icon="user" title="Tell us about yourself" subtitle="Your name and a short bio help customers trust you" colors={colors} />

      <InputGroup label="Full Name *" colors={colors}>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          value={form.name}
          onChangeText={(v) => setField("name", v)}
          placeholder="e.g. Ravi Kumar"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          autoFocus
        />
      </InputGroup>

      <InputGroup label="Short Bio" colors={colors}>
        <TextInput
          style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          value={form.bio}
          onChangeText={(v) => setField("bio", v)}
          placeholder="Describe your work experience and what makes you great at what you do…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </InputGroup>
    </View>
  );
}

function Step2({
  form,
  setField,
  toggleSkill,
  colors,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  toggleSkill: (s: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const skills = form.category ? SKILL_SUGGESTIONS[form.category] ?? [] : [];

  return (
    <View style={styles.stepWrap}>
      <StepHero icon="tool" title="What do you do?" subtitle="Choose your main category and specific skills" colors={colors} />

      <InputGroup label="Service Category *" colors={colors}>
        <View style={styles.chipGrid}>
          {SERVICE_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.chip,
                { borderColor: form.category === cat.id ? colors.primary : colors.border, backgroundColor: form.category === cat.id ? colors.primary + "18" : colors.card },
              ]}
              onPress={() => {
                setField("category", cat.id);
                setField("specializations", []);
              }}
            >
              <Icon name={cat.icon} size={14} color={form.category === cat.id ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.chipText, { color: form.category === cat.id ? colors.primary : colors.foreground }]}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </InputGroup>

      {skills.length > 0 && (
        <InputGroup label="Specific Skills *" colors={colors}>
          <View style={styles.chipGrid}>
            {skills.map((sk) => {
              const sel = form.specializations.includes(sk);
              return (
                <Pressable
                  key={sk}
                  style={[styles.chip, { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary + "18" : colors.card }]}
                  onPress={() => toggleSkill(sk)}
                >
                  {sel && <Icon name="check" size={13} color={colors.primary} />}
                  <Text style={[styles.chipText, { color: sel ? colors.primary : colors.foreground }]}>{sk}</Text>
                </Pressable>
              );
            })}
          </View>
        </InputGroup>
      )}

      <InputGroup label="Years of Experience *" colors={colors}>
        <View style={styles.chipGrid}>
          {EXPERIENCE_OPTIONS.map((exp) => {
            const sel = form.experience === exp;
            return (
              <Pressable
                key={exp}
                style={[styles.chip, { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary + "18" : colors.card }]}
                onPress={() => setField("experience", exp)}
              >
                <Text style={[styles.chipText, { color: sel ? colors.primary : colors.foreground }]}>{exp}</Text>
              </Pressable>
            );
          })}
        </View>
      </InputGroup>
    </View>
  );
}

function Step3({
  form,
  toggleArea,
  colors,
}: {
  form: FormData;
  toggleArea: (a: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepWrap}>
      <StepHero icon="map-pin" title="Where do you work?" subtitle="Select all cities or areas where you can take jobs" colors={colors} />

      <InputGroup label="Service Cities *" colors={colors}>
        <View style={styles.chipGrid}>
          {CITY_SUGGESTIONS.map((city) => {
            const sel = form.serviceAreas.includes(city);
            return (
              <Pressable
                key={city}
                style={[styles.chip, { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary + "18" : colors.card }]}
                onPress={() => toggleArea(city)}
              >
                {sel && <Icon name="check" size={13} color={colors.primary} />}
                <Text style={[styles.chipText, { color: sel ? colors.primary : colors.foreground }]}>{city}</Text>
              </Pressable>
            );
          })}
        </View>
      </InputGroup>

      {form.serviceAreas.length > 0 && (
        <View style={[styles.infoBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Icon name="check-circle" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {form.serviceAreas.length} area{form.serviceAreas.length !== 1 ? "s" : ""} selected: {form.serviceAreas.join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
}

function Step4({
  form,
  setField,
  colors,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const rate = Number(form.hourlyRate) || 0;
  const platformFee = Math.round(rate * 0.15);
  const yourEarnings = rate - platformFee;

  return (
    <View style={styles.stepWrap}>
      <StepHero icon="dollar-sign" title="Set your rate" subtitle="Your base hourly rate visible to customers" colors={colors} />

      <InputGroup label="Hourly Rate (₹) *" colors={colors}>
        <View style={[styles.rateRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.ratePrefix, { color: colors.mutedForeground }]}>₹</Text>
          <TextInput
            style={[styles.rateInput, { color: colors.foreground }]}
            value={form.hourlyRate}
            onChangeText={(v) => setField("hourlyRate", v.replace(/[^0-9]/g, ""))}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
          />
          <Text style={[styles.rateSuffix, { color: colors.mutedForeground }]}>/hr</Text>
        </View>
      </InputGroup>

      {rate > 0 && (
        <View style={[styles.earningsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.earningsTitle, { color: colors.foreground }]}>Earnings Breakdown</Text>
          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>Customer pays</Text>
            <Text style={[styles.earningsValue, { color: colors.foreground }]}>₹{rate}/hr</Text>
          </View>
          <View style={[styles.earningsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>Platform fee (15%)</Text>
            <Text style={[styles.earningsValue, { color: "#ef4444" }]}>−₹{platformFee}</Text>
          </View>
          <View style={[styles.earningsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Your earnings</Text>
            <Text style={[styles.earningsValue, { color: "#16a34a", fontFamily: "Inter_700Bold" }]}>₹{yourEarnings}/hr</Text>
          </View>
        </View>
      )}

      <View style={[styles.infoBox, { backgroundColor: "#fef9c3", borderColor: "#fde047" }]}>
        <Icon name="info" size={16} color="#ca8a04" />
        <Text style={[styles.infoText, { color: "#92400e" }]}>
          You can always update your rate later from your profile settings.
        </Text>
      </View>
    </View>
  );
}

function Step5({
  form,
  colors,
  pickDocument,
  uploadingDoc,
}: {
  form: FormData;
  colors: ReturnType<typeof useColors>;
  pickDocument: () => void;
  uploadingDoc: boolean;
}) {
  const hasDoc = !!form.idDocumentUrl;

  return (
    <View style={styles.stepWrap}>
      <StepHero icon="shield" title="Verify your identity" subtitle="Upload a government ID to build customer trust" colors={colors} />

      <Pressable
        style={[
          styles.uploadArea,
          {
            borderColor: hasDoc ? "#16a34a" : colors.border,
            backgroundColor: hasDoc ? "#f0fdf4" : colors.card,
          },
        ]}
        onPress={pickDocument}
        disabled={uploadingDoc}
      >
        {uploadingDoc ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : hasDoc ? (
          <>
            <View style={[styles.uploadIconWrap, { backgroundColor: "#dcfce7" }]}>
              <Icon name="check-circle" size={32} color="#16a34a" />
            </View>
            <Text style={[styles.uploadTitle, { color: "#16a34a" }]}>Document uploaded!</Text>
            <Text style={[styles.uploadSub, { color: "#166534" }]}>Tap to change</Text>
          </>
        ) : (
          <>
            <View style={[styles.uploadIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Icon name="upload" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload Government ID</Text>
            <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
              Aadhaar, PAN, Passport, or Driving Licence
            </Text>
            <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>JPG or PNG, max 5 MB</Text>
          </>
        )}
      </Pressable>

      <View style={[styles.infoBox, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
        <Icon name="shield" size={16} color="#1d4ed8" />
        <Text style={[styles.infoText, { color: "#1e40af" }]}>
          Your document is encrypted and only used for verification. You can skip this and verify later.
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Profile Summary</Text>
        <SummaryRow icon="user" label="Name" value={form.name || "—"} colors={colors} />
        <SummaryRow icon="tool" label="Category" value={form.category ? SERVICE_CATEGORIES.find(c => c.id === form.category)?.label ?? form.category : "—"} colors={colors} />
        <SummaryRow icon="map-pin" label="Areas" value={form.serviceAreas.length > 0 ? form.serviceAreas.slice(0, 3).join(", ") + (form.serviceAreas.length > 3 ? ` +${form.serviceAreas.length - 3}` : "") : "—"} colors={colors} />
        <SummaryRow icon="dollar-sign" label="Rate" value={form.hourlyRate ? `₹${form.hourlyRate}/hr` : "—"} colors={colors} />
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: colors.muted }]}>
        <Icon name={icon} size={14} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function StepHero({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: string;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.hero}>
      <View style={[styles.heroIcon, { backgroundColor: colors.primary + "18" }]}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.heroTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
    </View>
  );
}

function InputGroup({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 12 : 8, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerCount: { fontSize: 13, fontFamily: "Inter_500Medium", width: 36, textAlign: "right" },
  progressBar: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden" },
  progressSegment: { height: 4, borderRadius: 2 },
  content: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 6 },
  skipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stepWrap: { gap: 24, paddingTop: 8 },
  hero: { alignItems: "center", gap: 10, paddingVertical: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  ratePrefix: { fontSize: 18, fontFamily: "Inter_500Medium", paddingRight: 4 },
  rateInput: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", paddingVertical: 14 },
  rateSuffix: { fontSize: 15, fontFamily: "Inter_400Regular" },
  earningsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  earningsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  earningsRow: { flexDirection: "row", justifyContent: "space-between" },
  earningsLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  earningsValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  earningsDivider: { height: StyleSheet.hairlineWidth },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  uploadArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
    minHeight: 180,
  },
  uploadIconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  uploadTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  uploadSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  uploadHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 2 },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  summaryIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  summaryLabel: { width: 60, fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
});
