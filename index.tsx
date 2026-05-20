// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, Copy, Check, Mail, User, Building2, PenLine, Sparkles, Send, AlertCircle } from "lucide-react";

// --- UI Components (Shadcn-like) ---

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const Card = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm bg-white", className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);

const CardTitle = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <h3 className={cn("font-semibold leading-none tracking-tight text-lg", className)}>{children}</h3>
);

const CardContent = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

const Label = ({ children, className, htmlFor }: { children?: React.ReactNode; className?: string; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700", className)}>
    {children}
  </label>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "secondary"; size?: string }>(
  ({ className, variant = "default", size, ...props }, ref) => {
    const variants = {
      default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
      outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
      ghost: "hover:bg-slate-100 hover:text-slate-900",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// --- Main Application ---

const TONE_OPTIONS = [
  { value: "standard", label: "標準 (Standard)" },
  { value: "polite", label: "丁寧 (Polite)" },
  { value: "apologetic", label: "謝罪 (Apologetic)" },
  { value: "friendly", label: "親密 (Friendly)" },
];

const LOCAL_STORAGE_KEY = "biz_mail_profile_v1";

interface UserProfile {
  company: string;
  name: string;
  signature: string;
}

interface GeneratedEmail {
  subject: string;
  body: string;
}

const App = () => {
  // State: Mounting
  const [mounted, setMounted] = useState(false);

  // State: Profile
  const [profile, setProfile] = useState<UserProfile>({
    company: "",
    name: "",
    signature: "",
  });

  // State: Inputs
  const [receivedEmail, setReceivedEmail] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tone, setTone] = useState("standard");

  // State: Generation
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State: UI
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Handle Mounting and Initial Load
  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setProfile(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }
  }, []);

  // Save profile on change
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
      } catch (e) {
        console.error("Failed to save profile", e);
      }
    }
  }, [profile, mounted]);

  const handleCopy = (text: string, type: "subject" | "body") => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        if (type === "subject") {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
        } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
        }
    }
  };

  const generateEmail = async () => {
    if (!profile.name && !instructions && !receivedEmail) {
      setError("情報が不足しています。プロファイルや指示を入力してください。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const systemInstruction = `
        あなたは優秀なビジネス秘書AIです。
        ユーザーの情報、受信メール、返信の要点を元に、最適なビジネスメールを作成してください。

        【要件】
        1. 文脈に沿った自然な日本語を使用すること。
        2. 選択されたトーン（${tone}）に合わせること。
        3. 出力は必ずJSONのみで返すこと。マークダウンやコードブロックは使わず、{"subject": "件名", "body": "本文"}の形式のみで返すこと。
        4. 本文には、ユーザーの署名を自動的に含めないでください（UI側で管理する場合があるため）。ただし、文脈上必要なら入れても構いません。
      `;

      const prompt = `
        【ユーザー情報 (差出人)】
        会社名: ${profile.company || "未設定"}
        氏名: ${profile.name || "未設定"}
        署名: ${profile.signature || "なし"}

        【受信メール (コンテキスト)】
        ${receivedEmail || "（なし - 新規メール作成として扱う）"}

        【返信指示・メモ】
        ${instructions || "（特になし - 文脈から判断して適切な返信を作成）"}

        【希望するトーン】
        ${TONE_OPTIONS.find(t => t.value === tone)?.label}
      `;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemInstruction, prompt }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "サーバーエラーが発生しました");
      }

      const data = await res.json();
      const text = data.text;

      if (!text) {
        throw new Error("AIからの応答が空でした。");
      }

      // 3. Robust JSON Parsing
      let json: GeneratedEmail;
      try {
        // Clean markdown code blocks if present (e.g. ```json ... ```)
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
        }
        json = JSON.parse(cleanText) as GeneratedEmail;
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", text);
        throw new Error("AIの応答を解析できませんでした。");
      }

      // Append signature if it exists and isn't already in the body
      let finalBody = json.body || "";
      if (profile.signature && !finalBody.includes(profile.signature)) {
          finalBody += `\n\n${profile.signature}`;
      }

      setGeneratedEmail({
          subject: json.subject || "(件名なし)",
          body: finalBody
      });

    } catch (err: any) {
      console.error("Generation error details:", err);
      // User-friendly error message
      const errorMessage = err instanceof Error ? err.message : "不明なエラーが発生しました";
      setError(`エラーが発生しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">BizMail AI</h1>
              <p className="text-slate-500 text-sm">瞬時に最適なビジネスメールを作成</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT COLUMN: Input */}
          <div className="space-y-6">

            {/* 1. Profile Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-blue-600" />
                  MYプロファイル
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">会社名</Label>
                    <div className="relative">
                      <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="company"
                        placeholder="株式会社〇〇"
                        className="pl-9"
                        value={profile.company}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">氏名</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        placeholder="山田 太郎"
                        className="pl-9"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signature">署名</Label>
                  <Textarea
                    id="signature"
                    placeholder="--&#10;株式会社〇〇 営業部&#10;山田 太郎&#10;Email: ..."
                    className="min-h-[80px] font-mono text-xs leading-relaxed resize-none"
                    value={profile.signature}
                    onChange={(e) => setProfile({ ...profile, signature: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Received Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                受信メール <span className="text-slate-400 font-normal text-xs ml-auto">※相手のメールを貼り付け</span>
              </Label>
              <Textarea
                placeholder="相手からのメールをここに貼り付けてください。AIが文脈や相手の名前を自動で読み取ります。"
                className="min-h-[150px] resize-y"
                value={receivedEmail}
                onChange={(e) => setReceivedEmail(e.target.value)}
              />
            </div>

            {/* 3. Reply Instructions */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-slate-500" />
                返信指示・メモ <span className="text-slate-400 font-normal text-xs ml-auto">※箇条書きでOK</span>
              </Label>
              <Textarea
                placeholder="例：&#10;・資料添付したことを伝える&#10;・来週の水曜14時にMTG可能か聞く&#10;・遅れてごめん"
                className="min-h-[100px] resize-y bg-blue-50/30 border-blue-100 focus-visible:ring-blue-200"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            {/* 4. Controls & Action */}
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="tone">トーン</Label>
                <div className="relative">
                    <select
                        id="tone"
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                    >
                        {TONE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </div>
                </div>
              </div>
              <Button
                onClick={generateEmail}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> メールを生成する
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Output */}
          <div className="flex flex-col h-full min-h-[500px] lg:min-h-auto">
            <Card className="flex-1 flex flex-col h-full border-blue-100 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                  <Send className="w-4 h-4" />
                  生成結果
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-6 gap-6">
                {!generatedEmail ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 min-h-[300px]">
                    <div className="p-4 bg-slate-100 rounded-full">
                      <Sparkles className="w-8 h-8 text-slate-300" />
                    </div>
                    <p>左側のフォームに入力して<br/>「メールを生成する」を押してください</p>
                  </div>
                ) : (
                  <>
                    {/* Subject Field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">件名</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleCopy(generatedEmail.subject, "subject")}
                        >
                          {copiedSubject ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copiedSubject ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <Input
                        value={generatedEmail.subject}
                        onChange={(e) => setGeneratedEmail({ ...generatedEmail, subject: e.target.value })}
                        className="font-medium text-slate-900 border-slate-300 focus-visible:ring-blue-500"
                      />
                    </div>

                    {/* Body Field */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">本文</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleCopy(generatedEmail.body, "body")}
                        >
                          {copiedBody ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copiedBody ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <Textarea
                        value={generatedEmail.body}
                        onChange={(e) => setGeneratedEmail({ ...generatedEmail, body: e.target.value })}
                        className="flex-1 min-h-[300px] font-sans text-base leading-relaxed border-slate-300 focus-visible:ring-blue-500 p-4"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
