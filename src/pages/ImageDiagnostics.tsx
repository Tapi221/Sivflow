import React, { useState, useEffect } from "react";
import { firestoreDb } from "@/services/firebase";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { cardsPathSegments } from "@/services/firestorePaths";
import { useAuthSession } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "@/ui/icons";
import platform from "@/platform";

const ImageDiagnostics = () => {
  const { currentUser } = useAuthSession();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    valid: 0,
    error: 0,
    cors: 0,
  });

  const checkUrl = async (url, type, id, label) => {
    if (!url) return null;

    // Skip local URLs (blob:)
    if (url.startsWith("blob:")) {
      return {
        id,
        type,
        label,
        url: "Blob URL (ローカル)",
        status: "ローカル",
        code: 200,
        isOk: true,
      };
    }

    try {
      const start = performance.now();
      const response = await fetch(url, { method: "GET", mode: "cors" });
      const time = Math.round(performance.now() - start);

      const contentType = response.headers.get("content-type");
      const isImage = contentType?.startsWith("image/");

      return {
        id,
        type,
        label,
        url,
        status: response.status === 200 ? "OK" : response.statusText,
        code: response.status,
        contentType,
        isImage,
        time,
        isOk: response.ok && isImage,
      };
    } catch (error) {
      return {
        id,
        type,
        label,
        url,
        status: error.message, // Likely 'Failed to fetch' for CORS
        code: 0,
        isOk: false,
        errorType: error.message.includes("Failed to fetch")
          ? "CORS/Network"
          : "Other",
      };
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    const newResults = [];

    if (!currentUser) {
      alert("ログインが必要です");
      setLoading(false);
      return;
    }

    try {
      if (!firestoreDb) {
        console.warn("[ImageDiagnostics] firestoreDb not initialized.");
        setLoading(false);
        return;
      }

      // 1. Check User Profiles (Current User Only)
      // Fetch by ID directly to avoid "list" permission issues
      try {
        const docRef = await getDoc(
          doc(firestoreDb, "userSettings", currentUser.uid),
        );
        if (docRef.exists()) {
          const data = docRef.data();
          if (data.profileImage?.remoteUrl) {
            const res = await checkUrl(
              data.profileImage.remoteUrl,
              "プロフィール",
              docRef.id,
              data.displayName || "ユーザー",
            );
            if (res) newResults.push(res);
          }
        }
      } catch (e) {
        console.warn("Could not fetch user profile details", e);
      }

      // 2. Check Cards (Current User Only)
      // Must filter by userId to pass rules
      const cardsSnap = await getDocs(
        query(
          collection(firestoreDb, ...cardsPathSegments(currentUser.uid)),
          limit(50),
        ),
      );

      for (const doc of cardsSnap.docs) {
        const data = doc.data();

        // Question Images
        if (data.question_images && Array.isArray(data.question_images)) {
          for (let i = 0; i < data.question_images.length; i++) {
            const img = data.question_images[i];
            const url =
              img?.remoteUrl ||
              img?.url ||
              (typeof img === "string" ? img : null);
            if (url) {
              const res = await checkUrl(
                url,
                "カード (問題)",
                doc.id,
                `${data.title || "タイトルなし"} #${i + 1}`,
              );
              if (res) newResults.push(res);
            }
          }
        }

        // Answer Images
        if (data.answer_images && Array.isArray(data.answer_images)) {
          for (let i = 0; i < data.answer_images.length; i++) {
            const img = data.answer_images[i];
            const url =
              img?.remoteUrl ||
              img?.url ||
              (typeof img === "string" ? img : null);
            if (url) {
              const res = await checkUrl(
                url,
                "カード (解答)",
                doc.id,
                `${data.title || "タイトルなし"} #${i + 1}`,
              );
              if (res) newResults.push(res);
            }
          }
        }
      }

      setResults(newResults);

      // Calculate Summary
      const sum = { total: newResults.length, valid: 0, error: 0, cors: 0 };
      newResults.forEach((r) => {
        if (r.isOk) sum.valid++;
        else {
          sum.error++;
          if (r.errorType === "CORS/Network") sum.cors++;
        }
      });
      setSummary(sum);
    } catch (e) {
      console.error("Diagnosis failed", e);
      alert("診断に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      runDiagnostics();
    }
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" />
            画像診断ツール
          </h1>
          <Button onClick={runDiagnostics} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            診断を実行
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-slate-500 uppercase">
                チェック総数
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.valid}
              </div>
              <div className="text-xs text-slate-500 uppercase">正常</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.error}
              </div>
              <div className="text-xs text-slate-500 uppercase">エラー</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {summary.cors}
              </div>
              <div className="text-xs text-slate-500 uppercase">
                CORS/ネットエラー
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>詳細レポート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                  <tr>
                    <th className="px-4 py-3">ステータス</th>
                    <th className="px-4 py-3">種類</th>
                    <th className="px-4 py-3">ソースID / ラベル</th>
                    <th className="px-4 py-3">詳細</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r, i) => (
                    <tr key={i} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {r.isOk ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                            <CheckCircle className="w-4 h-4" /> 正常
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                            <XCircle className="w-4 h-4" />
                            {r.code === 0 ? "ネット/CORS" : r.code}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.type}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {r.label}
                        </div>
                        <div className="text-xs text-slate-400 font-serif">
                          {r.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs break-all">
                        <div className="text-xs text-slate-500">{r.url}</div>
                        {!r.isOk && (
                          <div className="text-xs text-red-500 mt-1 font-bold">
                            {r.status} {r.contentType && `(${r.contentType})`}
                          </div>
                        )}
                        {r.isOk && (
                          <div className="text-xs text-green-600 mt-1">
                            {r.contentType} • {r.time}ms
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void platform.shell.openExternal(r.url);
                          }}
                        >
                          開く
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImageDiagnostics;
