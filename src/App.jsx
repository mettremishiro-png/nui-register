import { useEffect, useMemo, useState } from "react";

const SEND_TO_EMAIL = "stormromance@gmail.com";

const creators = [
  { id: "asami", name: "あさみ", color: "#9333ea" },
  { id: "yurie", name: "ゆりえ", color: "#16a34a" },
  { id: "mikako", name: "みかこ", color: "#18181b" },
];

const defaultCreatorItems = {
  asami: [
    { size: "10cm", category: "Tシャツ", price: 600 },
    { size: "10cm", category: "アウター", price: 800 },
  ],
  yurie: [
    { size: "10cm", category: "サロペットセット", price: 1500 },
    { size: "10cm", category: "Tシャツ", price: 700 },
    { size: "10cm", category: "サロペット", price: 900 },
    { size: "10cm", category: "ヘアバンド", price: 500 },
    { size: "15cm", category: "サロペットセット", price: 1800 },
    { size: "15cm", category: "Tシャツ", price: 1000 },
    { size: "15cm", category: "羽根つきTシャツ", price: 1500 },
    { size: "15cm", category: "サロペット", price: 1000 },
  ],
  mikako: [
    { size: "15cm", category: "Tシャツ", price: 1000 },
    { size: "21cm", category: "Tシャツ", price: 1200 },
    { size: "15cm", category: "ジャケット", price: 1200 },
  ],
};

const yen = (num) => `¥${Number(num || 0).toLocaleString()}`;

const shortCategory = (category) => {
  if (category === "Tシャツ") return "Tシャツ";
  if (category === "アウター") return "アウター";
  if (category === "トップス") return "TOP";
  if (category === "サロペットセット") return "サロペSET";
  if (category === "サロペット") return "サロペ";
  if (category === "羽根つきTシャツ") return "羽根T";
  if (category === "ヘアバンド") return "ヘアバン";
  if (category === "ジャケット") return "ジャケット";
  if (category === "小物") return "小物";
  if (category === "その他") return "他";
  return category;
};

const shortSize = (size) => {
  if (size === "共通") return "共通";
  return size.replace("cm", "");
};

const makeKey = (creator, item) =>
  `${creator.id}_${item.size}_${item.category}_${item.price}`;

const loadItems = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("nui_creator_items") || "null");
    if (saved) return saved;
  } catch {
    // 保存データが壊れていたら初期値を使う
  }
  return defaultCreatorItems;
};

export default function App() {
  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState("");
  const [creatorItems, setCreatorItems] = useState(loadItems);
  const [editMode, setEditMode] = useState(false);
  const [editCreatorId, setEditCreatorId] = useState("asami");
  const [editForm, setEditForm] = useState({ size: "", category: "", price: "" });
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nui_sales_history") || "[]");
    } catch {
      return [];
    }
  });
const [eventName, setEventName] = useState(
  localStorage.getItem("nui_event_name") || ""
);

useEffect(() => {
  fetch("https://script.google.com/macros/s/AKfycbyUjvgENAJ2m9EoPNlnO8M14YQPU4gECJHb-k1GAz3FUU3VjAgsU58KPdC96W6_SszbnQ/exec")
    .then((res) => res.json())
    .then((data) => {
      const grouped = { asami: [], yurie: [], mikako: [] };

      data.forEach((item) => {
        if (!grouped[item.creator]) return;

        grouped[item.creator].push({
          size: item.size,
          category: item.category,
          price: Number(item.price),
        });
      });

      setCreatorItems(grouped);
      localStorage.setItem("nui_creator_items", JSON.stringify(grouped));
    })
    .catch(() => {
      console.log("スプレッドシートの商品読込に失敗しました");
    });
}, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const totalQty = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const change = Math.max((Number(paid) || 0) - total, 0);

  const creatorTotals = useMemo(() => {
    return creators.map((creator) => {
      const rows = cart.filter((item) => item.creatorId === creator.id);
      return {
        ...creator,
        qty: rows.reduce((sum, item) => sum + item.qty, 0),
        total: rows.reduce((sum, item) => sum + item.price * item.qty, 0),
      };
    });
  }, [cart]);

  const saveCreatorItems = (nextItems) => {
    setCreatorItems(nextItems);
    localStorage.setItem("nui_creator_items", JSON.stringify(nextItems));
  };

  const playSound = (type = "tap") => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.connect(gain);
      gain.connect(audio.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = type === "done" ? 880 : type === "delete" ? 260 : 520;
      gain.gain.setValueAtTime(0.06, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.08);

      oscillator.start(audio.currentTime);
      oscillator.stop(audio.currentTime + 0.08);
    } catch {
      // 音が鳴らない端末では何もしない
    }
  };

  const addItem = (creator, item) => {
    playSound("tap");
    const key = makeKey(creator, item);
    setCart((prev) => {
      const exists = prev.find((row) => row.key === key);
      if (exists) {
        return prev.map((row) =>
          row.key === key ? { ...row, qty: row.qty + 1 } : row
        );
      }
      return [
        ...prev,
        {
          key,
          creatorId: creator.id,
          creator: creator.name,
          color: creator.color,
          ...item,
          qty: 1,
        },
      ];
    });
  };

  const changeQty = (key, diff) => {
    playSound("tap");
    setCart((prev) =>
      prev
        .map((row) =>
          row.key === key ? { ...row, qty: Math.max(0, row.qty + diff) } : row
        )
        .filter((row) => row.qty > 0)
    );
  };

  const removeItem = (key) => {
    playSound("delete");
    setCart((prev) => prev.filter((row) => row.key !== key));
  };

  const clearCart = () => {
    playSound("delete");
    setCart([]);
    setPaid("");
  };

  const saveEventName = (value) => {
    setEventName(value);
    localStorage.setItem("nui_event_name", value);
  };

  const addPaidDigit = (digit) => {
    playSound("tap");
    setPaid((prev) => {
      if (digit === "C") return "";
      if (digit === "BS") return prev.slice(0, -1);
      if (prev === "0" && digit !== "00") return digit;
      return `${prev}${digit}`;
    });
  };

  const completeSale = () => {
    if (cart.length === 0) return;
    playSound("done");
    const sale = {
      id: Date.now(),
      eventName,
      time: new Date().toLocaleString("ja-JP"),
      total,
      totalQty,
      paid: Number(paid) || 0,
      change,
      items: cart,
    };
    setHistory((prev) => {
      const next = [sale, ...prev];
      localStorage.setItem("nui_sales_history", JSON.stringify(next));
      return next;
    });
    clearCart();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || editMode) return;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        addPaidDigit(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        addPaidDigit("BS");
        return;
      }

      if (event.key === "Delete" || event.key === "Escape") {
        event.preventDefault();
        addPaidDigit("C");
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        completeSale();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, paid, total, totalQty, change, eventName, editMode]);

const makeCSV = (filterCreator = null) => {
  const header = [
    "イベント名",
    "会計日時",
    "作家",
    "サイズ",
    "カテゴリ",
    "単価",
    "数量",
  ];

  const rows = history.flatMap((sale) =>
    sale.items
      .filter((item) => !filterCreator || item.creator === filterCreator)
      .map((item) => [
        sale.eventName,
        sale.time,
        item.creator,
        item.size,
        item.category,
        item.price,
        item.qty,
      ])
  );

  return [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");
};

const downloadCSV = (csv, fileName) => {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const exportCSV = () => {
  const baseName = eventName || "nui-register";

  downloadCSV(makeCSV(), `${baseName}_全体.csv`);

  creators.forEach((creator) => {
    downloadCSV(makeCSV(creator.name), `${baseName}_${creator.name}.csv`);
  });
};

const shareCSV = async () => {
  if (history.length === 0) return;
  playSound("tap");

  const baseName = eventName || "nui-register";
  const bom = "\uFEFF";
  const file = new File([bom + makeCSV()], `${baseName}_全体.csv`, {
    type: "text/csv;charset=utf-8;",
  });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${eventName || "ぬい服レジ"} 売上CSV`,
        text: "売上CSVを共有します。",
        files: [file],
      });
      return;
    } catch {
      // 共有キャンセル時はCSV保存へ
    }
  }

  exportCSV();
  alert(
    "この端末ではCSV添付の共有に対応していないため、CSVを保存しました。保存したCSVをメールに添付してください。"
  );
};

const clearHistory = () => {
  if (!window.confirm("履歴をすべて削除しますか？")) return;
  setHistory([]);
  localStorage.removeItem("nui_sales_history");
};

  const addProduct = () => {
    const size = editForm.size.trim();
    const category = editForm.category.trim();
    const price = Number(editForm.price);

    if (!size || !category || !price) {
      alert("サイズ・商品名・価格を入力してください");
      return;
    }

    const nextItems = {
      ...creatorItems,
      [editCreatorId]: [
        ...(creatorItems[editCreatorId] || []),
        { size, category, price },
      ],
    };
    saveCreatorItems(nextItems);
    setEditForm({ size: "", category: "", price: "" });
    playSound("done");
  };

  const updateProduct = (creatorId, index, field, value) => {
    const nextItems = {
      ...creatorItems,
      [creatorId]: creatorItems[creatorId].map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          [field]: field === "price" ? Number(value.replace(/[^0-9]/g, "")) || 0 : value,
        };
      }),
    };
    saveCreatorItems(nextItems);
  };

  const deleteProduct = (creatorId, index) => {
    if (!window.confirm("この商品を削除しますか？")) return;
    const nextItems = {
      ...creatorItems,
      [creatorId]: creatorItems[creatorId].filter((_, itemIndex) => itemIndex !== index),
    };
    saveCreatorItems(nextItems);
    playSound("delete");
  };

  const moveProduct = (creatorId, index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= creatorItems[creatorId].length) return;

    const nextList = [...creatorItems[creatorId]];
    [nextList[index], nextList[targetIndex]] = [nextList[targetIndex], nextList[index]];

    saveCreatorItems({
      ...creatorItems,
      [creatorId]: nextList,
    });
  };

  const resetProducts = () => {
    if (!window.confirm("商品設定を初期状態に戻しますか？")) return;
    saveCreatorItems(defaultCreatorItems);
    playSound("delete");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.label}>ぬい服即売会用</div>
          <h1 style={styles.title}>高速会計レジ</h1>
        </div>
        <div style={styles.eventBox}>
          <label style={styles.smallLabel}>イベント名</label>
          <input
            value={eventName}
            onChange={(e) => saveEventName(e.target.value)}
            placeholder="例：arteVarie / ぬいFes"
            style={styles.eventInput}
          />
        </div>
        <button
          style={editMode ? styles.editModeOnButton : styles.editModeButton}
          onClick={() => setEditMode((prev) => !prev)}
        >
          {editMode ? "会計モードへ" : "商品管理"}
        </button>
      </header>

      {editMode ? (
        <main style={styles.editorPage}>
          <section style={styles.panel}>
            <div style={styles.editorHeader}>
              <div>
                <h2 style={styles.panelTitle}>商品管理</h2>
                <div style={styles.helpText}>ここで追加・編集した商品は、この端末に保存されます。</div>
              </div>
              <button style={styles.clearHistoryButton} onClick={resetProducts}>
                初期値に戻す
              </button>
            </div>

            <div style={styles.creatorTabs}>
              {creators.map((creator) => (
                <button
                  key={creator.id}
                  onClick={() => setEditCreatorId(creator.id)}
                  style={
                    editCreatorId === creator.id
                      ? { ...styles.creatorTabActive, background: creator.color }
                      : styles.creatorTab
                  }
                >
                  {creator.name}
                </button>
              ))}
            </div>

            <div style={styles.addProductBox}>
              <input
                value={editForm.size}
                onChange={(e) => setEditForm((prev) => ({ ...prev, size: e.target.value }))}
                placeholder="サイズ 例：10cm"
                style={styles.editorInput}
              />
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="商品名 例：Tシャツ"
                style={styles.editorInput}
              />
              <input
                value={editForm.price}
                onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value.replace(/[^0-9]/g, "") }))}
                placeholder="価格 例：600"
                inputMode="numeric"
                style={styles.editorInput}
              />
              <button style={styles.addProductButton} onClick={addProduct}>
                追加
              </button>
            </div>

            <div style={styles.productList}>
              {(creatorItems[editCreatorId] || []).map((item, index) => (
                <div key={`${item.size}_${item.category}_${item.price}_${index}`} style={styles.productRow}>
                  <input
                    value={item.size}
                    onChange={(e) => updateProduct(editCreatorId, index, "size", e.target.value)}
                    style={styles.productInputSmall}
                  />
                  <input
                    value={item.category}
                    onChange={(e) => updateProduct(editCreatorId, index, "category", e.target.value)}
                    style={styles.productInput}
                  />
                  <input
                    value={item.price}
                    onChange={(e) => updateProduct(editCreatorId, index, "price", e.target.value)}
                    inputMode="numeric"
                    style={styles.productInputSmall}
                  />
                  <button style={styles.miniButton} onClick={() => moveProduct(editCreatorId, index, -1)}>↑</button>
                  <button style={styles.miniButton} onClick={() => moveProduct(editCreatorId, index, 1)}>↓</button>
                  <button style={styles.deleteButton} onClick={() => deleteProduct(editCreatorId, index)}>削除</button>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <div style={styles.layout}>
          <main style={styles.main}>
            {creators.map((creator) => (
              <section key={creator.id} style={styles.creatorSection}>
                <h2 style={{ ...styles.creatorTitle, color: creator.color }}>
                  {creator.name}
                </h2>
                <div style={styles.buttonGrid}>
                  {(creatorItems[creator.id] || []).map((item) => (
                    <button
                      key={makeKey(creator, item)}
                      onClick={() => addItem(creator, item)}
                      style={{ ...styles.itemButton, background: creator.color }}
                    >
                      <div style={styles.buttonMain}>{shortSize(item.size)} {shortCategory(item.category)}</div>
                      <div style={styles.buttonPrice}>{yen(item.price)}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </main>

          <aside style={styles.side}>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>会計中</h2>

              {cart.length === 0 ? (
                <div style={styles.empty}>左のボタンを押すとここに入ります</div>
              ) : (
                cart.map((item) => (
                  <div key={item.key} style={styles.cartRow}>
                    <div>
                      <span style={{ ...styles.creatorChip, background: item.color }}>
                        {item.creator}
                      </span>
                      <div style={styles.cartName}>
                        {item.size} / {item.category}
                      </div>
                      <div style={styles.cartSub}>
                        {yen(item.price)} × {item.qty} = {yen(item.price * item.qty)}
                      </div>
                    </div>
                    <div style={styles.qtyBox}>
                      <button style={styles.qtyButton} onClick={() => changeQty(item.key, -1)}>
                        −
                      </button>
                      <strong style={styles.qtyNum}>{item.qty}</strong>
                      <button style={styles.qtyButton} onClick={() => changeQty(item.key, 1)}>
                        ＋
                      </button>
                      <button style={styles.deleteButton} onClick={() => removeItem(item.key)}>
                        削除
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div style={styles.totalBox}>
                <div style={styles.smallLabelLight}>合計 / {totalQty}点</div>
                <div style={styles.total}>{yen(total)}</div>
              </div>

              <label style={styles.smallLabel}>お預かり金額</label>
              <div style={styles.paidDisplay}>{paid ? yen(paid) : "¥0"}</div>

              <div style={styles.changeBox}>
                <div style={styles.smallLabel}>お釣り</div>
                <div style={styles.change}>{yen(change)}</div>
              </div>

              <div style={styles.keypad}>
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "BS"].map((key) => (
                  <button
                    key={key}
                    style={key === "BS" ? styles.keypadSubButton : styles.keypadButton}
                    onClick={() => addPaidDigit(key)}
                  >
                    {key === "BS" ? "←" : key}
                  </button>
                ))}
                <button style={styles.keypadClearButton} onClick={() => addPaidDigit("C")}>
                  C
                </button>
              </div>

              <div style={styles.actionGrid}>
                <button style={styles.clearButton} onClick={clearCart}>
                  クリア
                </button>
                <button style={styles.doneButton} onClick={completeSale}>
                  会計完了
                </button>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>作家別売上（会計中）</h2>
              {creatorTotals.map((creator) => (
                <div key={creator.id} style={styles.summaryRow}>
                  <span>{creator.name}：{creator.qty}点</span>
                  <strong>{yen(creator.total)}</strong>
                </div>
              ))}
            </section>

            <section style={styles.panel}>
              <div style={styles.historyHeader}>
                <h2 style={styles.panelTitle}>履歴</h2>
                <div style={styles.historyButtons}>
                  <button style={styles.csvButton} onClick={exportCSV} disabled={history.length === 0}>
                    CSV保存
                  </button>
                  <button style={styles.mailButton} onClick={shareCSV} disabled={history.length === 0}>
                    CSV共有
                  </button>
                  <button style={styles.clearHistoryButton} onClick={clearHistory} disabled={history.length === 0}>
                    履歴削除
                  </button>
                </div>
              </div>
              {history.length === 0 ? (
                <div style={styles.empty}>会計完了すると履歴が端末に保存されます</div>
              ) : (
                history.slice(0, 10).map((sale) => (
                  <div key={sale.id} style={styles.historyRow}>
                    <div>
                      <strong>{sale.time}</strong>
                      <div style={styles.cartSubDark}>{sale.totalQty}点 / お預かり {yen(sale.paid)}</div>
                    </div>
                    <strong>{yen(sale.total)}</strong>
                  </div>
                ))
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f4f5",
    padding: 16,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#18181b",
  },
  header: {
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    flexWrap: "wrap",
  },
  label: { color: "#71717a", fontWeight: 700, fontSize: 13 },
  title: { margin: 0, fontSize: 36, lineHeight: 1.1 },
  eventBox: { minWidth: 260, flex: "1 1 300px" },
  smallLabel: { fontSize: 13, color: "#71717a", fontWeight: 800 },
  smallLabelLight: { fontSize: 13, color: "#d4d4d8", fontWeight: 800 },
  eventInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 14,
    padding: 12,
    fontSize: 18,
    fontWeight: 700,
    marginTop: 4,
  },
  editModeButton: {
    border: 0,
    borderRadius: 16,
    padding: "14px 18px",
    background: "#18181b",
    color: "white",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
  },
  editModeOnButton: {
    border: 0,
    borderRadius: 16,
    padding: "14px 18px",
    background: "#2563eb",
    color: "white",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 420px",
    gap: 16,
    alignItems: "start",
  },
  main: { display: "grid", gap: 12 },
  creatorSection: {
    background: "white",
    borderRadius: 24,
    padding: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  creatorTitle: { margin: "0 0 10px", fontSize: 24 },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
    gap: 8,
  },
  itemButton: {
    color: "white",
    border: 0,
    borderRadius: 14,
    padding: 10,
    textAlign: "center",
    cursor: "pointer",
    minHeight: 74,
    boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
  },
  buttonMain: { fontSize: 21, fontWeight: 950, lineHeight: 1.1 },
  buttonPrice: { fontSize: 20, fontWeight: 950, marginTop: 6 },
  side: {
    display: "grid",
    gap: 12,
    position: "sticky",
    top: 12,
  },
  panel: {
    background: "white",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  panelTitle: { margin: "0 0 10px", fontSize: 20 },
  empty: {
    padding: 16,
    border: "2px dashed #d4d4d8",
    borderRadius: 16,
    color: "#71717a",
    textAlign: "center",
    fontWeight: 700,
  },
  cartRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    background: "#18181b",
    color: "white",
    marginBottom: 8,
  },
  creatorChip: {
    color: "white",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 900,
  },
  cartName: { fontSize: 18, fontWeight: 900, marginTop: 4 },
  cartSub: { color: "#d4d4d8", fontSize: 13, fontWeight: 700 },
  cartSubDark: { color: "#71717a", fontSize: 13, fontWeight: 700 },
  qtyBox: { display: "flex", alignItems: "center", gap: 6 },
  qtyButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "1px solid #d4d4d8",
    background: "white",
    color: "black",
    fontSize: 22,
    fontWeight: 900,
    cursor: "pointer",
  },
  qtyNum: { width: 26, textAlign: "center", fontSize: 20 },
  deleteButton: {
    border: 0,
    borderRadius: 999,
    padding: "9px 12px",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 900,
    cursor: "pointer",
  },
  totalBox: {
    background: "#18181b",
    color: "white",
    borderRadius: 16,
    padding: 12,
    margin: "12px 0",
  },
  total: { fontSize: 44, fontWeight: 950, lineHeight: 1.1 },
  paidDisplay: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 16,
    padding: 12,
    fontSize: 28,
    fontWeight: 950,
    margin: "4px 0 8px",
    background: "#fafafa",
    textAlign: "right",
  },
  changeBox: {
    background: "#fef3c7",
    color: "#18181b",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  change: { fontSize: 34, fontWeight: 950 },
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 10,
  },
  keypadButton: {
    border: 0,
    borderRadius: 14,
    padding: 14,
    background: "#18181b",
    color: "white",
    fontSize: 24,
    fontWeight: 950,
    cursor: "pointer",
  },
  keypadSubButton: {
    border: 0,
    borderRadius: 14,
    padding: 14,
    background: "#18181b",
    color: "white",
    fontSize: 24,
    fontWeight: 950,
    cursor: "pointer",
  },
  keypadClearButton: {
    gridColumn: "1 / 4",
    border: 0,
    borderRadius: 14,
    padding: 12,
    background: "#18181b",
    color: "white",
    fontSize: 20,
    fontWeight: 950,
    cursor: "pointer",
  },
  actionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  clearButton: {
    border: 0,
    borderRadius: 16,
    padding: 16,
    background: "#e4e4e7",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
  },
  doneButton: {
    border: 0,
    borderRadius: 16,
    padding: 16,
    background: "#2563eb",
    color: "white",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #e4e4e7",
    fontWeight: 800,
  },
  historyHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  historyButtons: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  csvButton: {
    border: 0,
    borderRadius: 999,
    padding: "8px 12px",
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 900,
    cursor: "pointer",
  },
  mailButton: {
    border: 0,
    borderRadius: 999,
    padding: "8px 12px",
    background: "#dbeafe",
    color: "#1e40af",
    fontWeight: 900,
    cursor: "pointer",
  },
  clearHistoryButton: {
    border: 0,
    borderRadius: 999,
    padding: "8px 12px",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 900,
    cursor: "pointer",
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    background: "#f4f4f5",
    marginBottom: 8,
  },
  editorPage: { maxWidth: 1100, margin: "0 auto" },
  editorHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  helpText: { color: "#71717a", fontSize: 13, fontWeight: 700 },
  creatorTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 12,
  },
  creatorTab: {
    border: 0,
    borderRadius: 14,
    padding: 12,
    background: "#e4e4e7",
    color: "#18181b",
    fontWeight: 950,
    cursor: "pointer",
  },
  creatorTabActive: {
    border: 0,
    borderRadius: 14,
    padding: 12,
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
  },
  addProductBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr 1fr auto",
    gap: 8,
    padding: 12,
    borderRadius: 18,
    background: "#f4f4f5",
    marginBottom: 12,
  },
  editorInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 12,
    padding: 11,
    fontSize: 16,
    fontWeight: 800,
  },
  addProductButton: {
    border: 0,
    borderRadius: 12,
    padding: "11px 18px",
    background: "#2563eb",
    color: "white",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
  },
  productList: { display: "grid", gap: 8 },
  productRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 120px 44px 44px auto",
    gap: 8,
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    background: "#fafafa",
    border: "1px solid #e4e4e7",
  },
  productInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    fontWeight: 800,
  },
  productInputSmall: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    fontWeight: 800,
  },
  miniButton: {
    border: 0,
    borderRadius: 999,
    padding: 10,
    background: "#e4e4e7",
    fontWeight: 950,
    cursor: "pointer",
  },
};
