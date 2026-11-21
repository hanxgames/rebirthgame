/* ReBirth — Topluluk (topluluk.html): Reddit benzeri tek ekranlı akış. Google ile giriş (Firebase Auth), veri Realtime Database
   (dead-mans-deck-global). Kurallar: YenidenDogus/ajanlar/site/topluluk_kurallar.py (oyuncu yalnız kendi adına yazar; oy ve yorum
   sayaçları aynı istekte doğrulanır; günde en çok 5 gönderi, 60 yorum; 30 günden eski gönderiyi herkes silebilir, sayfa açılışta
   siler). Görsel tarayıcıda küçültülüp (WebP/JPEG, en çok ~280 bin karakter) topluluk_gorsel/<pid>'e yazılır.
   Yerel deneme (emülatör): localhost'ta ?emu=1 → Auth 127.0.0.1:9099, Database 127.0.0.1:9000. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, signOut, onAuthStateChanged, connectAuthEmulator }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, update, push, query, orderByChild, limitToLast, limitToFirst, endAt, onValue, serverTimestamp,
  connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const D = window.RBDil;
const SAKLAMA_MS = 30 * 86400000;
const GORSEL_EN_COK = 280000;
const ETIKETLER = ["oneri", "hata", "strateji", "senaryo", "diger"];
const GONDERI_DILLERI = [["tr", "Türkçe"], ["en", "English"], ["es", "Español"], ["pt_BR", "Português"], ["de", "Deutsch"],
  ["fr", "Français"], ["id", "Bahasa Indonesia"], ["ru", "Русский"], ["ja", "日本語"], ["ko", "한국어"], ["zh_CN", "简体中文"], ["zh_TW", "繁體中文"]];

const S = {
  "title": { tr: "Topluluk", en: "Community", es: "Comunidad", pt_BR: "Comunidade", de: "Community", fr: "Communauté", id: "Komunitas", ja: "コミュニティ", ko: "커뮤니티", zh_CN: "社区", zh_TW: "社群" },
  "nav.home": { tr: "Site", en: "Home", es: "Inicio", pt_BR: "Início", de: "Startseite", fr: "Accueil", id: "Beranda", ja: "ホーム", ko: "홈", zh_CN: "首页", zh_TW: "首頁" },
  "nav.news": { tr: "Haberler", en: "News", es: "Noticias", pt_BR: "Notícias", de: "News", fr: "Actualités", id: "Berita", ja: "ニュース", ko: "뉴스", zh_CN: "新闻", zh_TW: "新聞" },
  "nav.community": { tr: "Topluluk", en: "Community", es: "Comunidad", pt_BR: "Comunidade", de: "Community", fr: "Communauté", id: "Komunitas", ja: "コミュニティ", ko: "커뮤니티", zh_CN: "社区", zh_TW: "社群" },
  "nav.support": { tr: "Destek", en: "Support", es: "Soporte", pt_BR: "Suporte", de: "Support", fr: "Assistance", id: "Dukungan", ja: "サポート", ko: "지원", zh_CN: "支持", zh_TW: "支援" },
  "lead": {
    tr: "Görüşlerini, önerilerini ve ekran görüntülerini paylaş; diğer komutanlarla tartış.",
    en: "Share your ideas, suggestions and screenshots, and discuss them with other commanders.",
    es: "Comparte tus ideas, sugerencias y capturas, y debátelas con otros comandantes.",
    pt_BR: "Compartilhe ideias, sugestões e capturas de tela e converse com outros comandantes.",
    de: "Teile Ideen, Vorschläge und Screenshots und diskutiere mit anderen Kommandanten.",
    fr: "Partagez vos idées, suggestions et captures d'écran, et discutez-en avec d'autres commandants.",
    id: "Bagikan ide, saran, dan tangkapan layar, lalu diskusikan dengan komandan lain.",
    ja: "アイデアや提案、スクリーンショットを共有して、ほかの司令官と語り合おう。",
    ko: "아이디어와 제안, 스크린샷을 공유하고 다른 지휘관들과 이야기해 보세요.",
    zh_CN: "分享你的想法、建议和截图，与其他指挥官一起讨论。",
    zh_TW: "分享你的想法、建議和截圖，與其他指揮官一起討論。" },
  "sort.top": { tr: "En çok beğenilen", en: "Top", es: "Más votados", pt_BR: "Mais votados", de: "Top", fr: "Les mieux notés", id: "Teratas", ja: "人気", ko: "인기", zh_CN: "最热", zh_TW: "最熱" },
  "sort.comments": { tr: "En çok yorumlanan", en: "Most comments", es: "Más comentados", pt_BR: "Mais comentados", de: "Meiste Kommentare", fr: "Les plus commentés", id: "Paling banyak komentar", ja: "コメント数", ko: "댓글 많은 순", zh_CN: "评论最多", zh_TW: "留言最多" },
  "sort.new": { tr: "En yeni", en: "New", es: "Nuevos", pt_BR: "Novos", de: "Neu", fr: "Nouveaux", id: "Terbaru", ja: "新着", ko: "최신", zh_CN: "最新", zh_TW: "最新" },
  "signin": { tr: "Google ile giriş yap", en: "Sign in with Google", es: "Iniciar sesión con Google", pt_BR: "Entrar com o Google", de: "Mit Google anmelden", fr: "Se connecter avec Google", id: "Masuk dengan Google", ja: "Googleでログイン", ko: "Google로 로그인", zh_CN: "使用 Google 登录", zh_TW: "使用 Google 登入" },
  "signin.why": { tr: "Paylaşmak, oy vermek ve yorum yapmak için giriş yap.", en: "Sign in to post, vote and comment.", es: "Inicia sesión para publicar, votar y comentar.", pt_BR: "Entre para publicar, votar e comentar.", de: "Melde dich an, um zu posten, abzustimmen und zu kommentieren.", fr: "Connectez-vous pour publier, voter et commenter.", id: "Masuk untuk memposting, memberi suara, dan berkomentar.", ja: "投稿・投票・コメントするにはログインしてください。", ko: "글쓰기, 투표, 댓글을 하려면 로그인하세요.", zh_CN: "登录后即可发帖、投票和评论。", zh_TW: "登入後即可發文、投票和留言。" },
  "signout": { tr: "Çıkış", en: "Sign out", es: "Cerrar sesión", pt_BR: "Sair", de: "Abmelden", fr: "Se déconnecter", id: "Keluar", ja: "ログアウト", ko: "로그아웃", zh_CN: "退出", zh_TW: "登出" },
  "new": { tr: "Gönderi paylaş", en: "Create post", es: "Crear publicación", pt_BR: "Criar publicação", de: "Beitrag erstellen", fr: "Créer une publication", id: "Buat postingan", ja: "投稿する", ko: "글쓰기", zh_CN: "发帖", zh_TW: "發文" },
  "nick": { tr: "Takma ad", en: "Nickname", es: "Apodo", pt_BR: "Apelido", de: "Spitzname", fr: "Pseudo", id: "Nama panggilan", ja: "ニックネーム", ko: "닉네임", zh_CN: "昵称", zh_TW: "暱稱" },
  "nick.hint": { tr: "Gönderilerinde bu ad görünür. E-postan ve Google adın hiçbir zaman gösterilmez.", en: "This name appears on your posts. Your email and Google name are never shown.", es: "Este nombre aparece en tus publicaciones. Tu correo y tu nombre de Google nunca se muestran.", pt_BR: "Este nome aparece nas suas publicações. Seu e-mail e nome do Google nunca são exibidos.", de: "Dieser Name steht bei deinen Beiträgen. E-Mail und Google-Name werden nie angezeigt.", fr: "Ce nom apparaît sur vos publications. Votre e-mail et votre nom Google ne sont jamais affichés.", id: "Nama ini muncul di postinganmu. Email dan nama Google-mu tidak pernah ditampilkan.", ja: "投稿にはこの名前が表示されます。メールアドレスとGoogleの名前は表示されません。", ko: "게시물에는 이 이름이 표시됩니다. 이메일과 Google 이름은 표시되지 않습니다.", zh_CN: "你的帖子会显示这个名字。你的邮箱和 Google 名字永远不会显示。", zh_TW: "你的貼文會顯示這個名字。你的電子郵件和 Google 名稱永遠不會顯示。" },
  "save": { tr: "Kaydet", en: "Save", es: "Guardar", pt_BR: "Salvar", de: "Speichern", fr: "Enregistrer", id: "Simpan", ja: "保存", ko: "저장", zh_CN: "保存", zh_TW: "儲存" },
  "cancel": { tr: "Vazgeç", en: "Cancel", es: "Cancelar", pt_BR: "Cancelar", de: "Abbrechen", fr: "Annuler", id: "Batal", ja: "キャンセル", ko: "취소", zh_CN: "取消", zh_TW: "取消" },
  "f.title": { tr: "Başlık", en: "Title", es: "Título", pt_BR: "Título", de: "Titel", fr: "Titre", id: "Judul", ja: "タイトル", ko: "제목", zh_CN: "标题", zh_TW: "標題" },
  "f.text": { tr: "Ne düşünüyorsun?", en: "What's on your mind?", es: "¿Qué opinas?", pt_BR: "O que você acha?", de: "Was denkst du?", fr: "Qu'en pensez-vous ?", id: "Apa pendapatmu?", ja: "あなたの考えは？", ko: "어떤 생각이 있으신가요?", zh_CN: "你有什么想法？", zh_TW: "你有什麼想法？" },
  "f.tag": { tr: "Konu", en: "Topic", es: "Tema", pt_BR: "Tema", de: "Thema", fr: "Sujet", id: "Topik", ja: "トピック", ko: "주제", zh_CN: "主题", zh_TW: "主題" },
  "f.lang": { tr: "Dil", en: "Language", es: "Idioma", pt_BR: "Idioma", de: "Sprache", fr: "Langue", id: "Bahasa", ja: "言語", ko: "언어", zh_CN: "语言", zh_TW: "語言" },
  "f.image": { tr: "Ekran görüntüsü ekle (isteğe bağlı)", en: "Add a screenshot (optional)", es: "Añadir una captura (opcional)", pt_BR: "Adicionar captura de tela (opcional)", de: "Screenshot hinzufügen (optional)", fr: "Ajouter une capture (facultatif)", id: "Tambahkan tangkapan layar (opsional)", ja: "スクリーンショットを追加（任意）", ko: "스크린샷 추가(선택)", zh_CN: "添加截图（可选）", zh_TW: "加入截圖（選填）" },
  "f.send": { tr: "Paylaş", en: "Post", es: "Publicar", pt_BR: "Publicar", de: "Posten", fr: "Publier", id: "Posting", ja: "投稿", ko: "게시", zh_CN: "发布", zh_TW: "發布" },
  "tag.oneri": { tr: "Öneri", en: "Suggestion", es: "Sugerencia", pt_BR: "Sugestão", de: "Vorschlag", fr: "Suggestion", id: "Saran", ja: "提案", ko: "제안", zh_CN: "建议", zh_TW: "建議" },
  "tag.hata": { tr: "Hata", en: "Bug", es: "Error", pt_BR: "Bug", de: "Fehler", fr: "Bug", id: "Bug", ja: "不具合", ko: "버그", zh_CN: "问题", zh_TW: "問題" },
  "tag.strateji": { tr: "Strateji", en: "Strategy", es: "Estrategia", pt_BR: "Estratégia", de: "Strategie", fr: "Stratégie", id: "Strategi", ja: "戦略", ko: "전략", zh_CN: "策略", zh_TW: "策略" },
  "tag.senaryo": { tr: "Senaryo", en: "Scenario", es: "Escenario", pt_BR: "Cenário", de: "Szenario", fr: "Scénario", id: "Skenario", ja: "シナリオ", ko: "시나리오", zh_CN: "剧本", zh_TW: "劇本" },
  "tag.diger": { tr: "Diğer", en: "Other", es: "Otro", pt_BR: "Outro", de: "Sonstiges", fr: "Autre", id: "Lainnya", ja: "その他", ko: "기타", zh_CN: "其他", zh_TW: "其他" },
  "comments": { tr: "yorum", en: "comments", es: "comentarios", pt_BR: "comentários", de: "Kommentare", fr: "commentaires", id: "komentar", ja: "件のコメント", ko: "개의 댓글", zh_CN: "条评论", zh_TW: "則留言" },
  "comment1": { tr: "yorum", en: "comment", es: "comentario", pt_BR: "comentário", de: "Kommentar", fr: "commentaire", id: "komentar", ja: "件のコメント", ko: "개의 댓글", zh_CN: "条评论", zh_TW: "則留言" },
  "comment.ph": { tr: "Yorum yaz…", en: "Write a comment…", es: "Escribe un comentario…", pt_BR: "Escreva um comentário…", de: "Kommentar schreiben…", fr: "Écrire un commentaire…", id: "Tulis komentar…", ja: "コメントを書く…", ko: "댓글 쓰기…", zh_CN: "写评论…", zh_TW: "寫留言…" },
  "send": { tr: "Gönder", en: "Send", es: "Enviar", pt_BR: "Enviar", de: "Senden", fr: "Envoyer", id: "Kirim", ja: "送信", ko: "보내기", zh_CN: "发送", zh_TW: "送出" },
  "translate": { tr: "Çevir", en: "Translate", es: "Traducir", pt_BR: "Traduzir", de: "Übersetzen", fr: "Traduire", id: "Terjemahkan", ja: "翻訳", ko: "번역", zh_CN: "翻译", zh_TW: "翻譯" },
  "original": { tr: "Aslını göster", en: "Show original", es: "Ver original", pt_BR: "Ver original", de: "Original anzeigen", fr: "Voir l'original", id: "Lihat asli", ja: "原文を表示", ko: "원문 보기", zh_CN: "显示原文", zh_TW: "顯示原文" },
  "report": { tr: "Bildir", en: "Report", es: "Denunciar", pt_BR: "Denunciar", de: "Melden", fr: "Signaler", id: "Laporkan", ja: "報告", ko: "신고", zh_CN: "举报", zh_TW: "檢舉" },
  "reported": { tr: "Bildirildi, teşekkürler", en: "Reported, thanks", es: "Denunciado, gracias", pt_BR: "Denunciado, obrigado", de: "Gemeldet, danke", fr: "Signalé, merci", id: "Dilaporkan, terima kasih", ja: "報告しました", ko: "신고했습니다", zh_CN: "已举报，谢谢", zh_TW: "已檢舉，謝謝" },
  "delete": { tr: "Sil", en: "Delete", es: "Eliminar", pt_BR: "Excluir", de: "Löschen", fr: "Supprimer", id: "Hapus", ja: "削除", ko: "삭제", zh_CN: "删除", zh_TW: "刪除" },
  "delete.q": { tr: "Silinsin mi? Bu geri alınamaz.", en: "Delete this? It can't be undone.", es: "¿Eliminar? No se puede deshacer.", pt_BR: "Excluir? Não pode ser desfeito.", de: "Löschen? Das kann nicht rückgängig gemacht werden.", fr: "Supprimer ? C'est définitif.", id: "Hapus? Tidak bisa dibatalkan.", ja: "削除しますか？元に戻せません。", ko: "삭제할까요? 되돌릴 수 없습니다.", zh_CN: "确定删除？此操作无法撤销。", zh_TW: "確定刪除？此操作無法復原。" },
  "share": { tr: "Bağlantıyı kopyala", en: "Copy link", es: "Copiar enlace", pt_BR: "Copiar link", de: "Link kopieren", fr: "Copier le lien", id: "Salin tautan", ja: "リンクをコピー", ko: "링크 복사", zh_CN: "复制链接", zh_TW: "複製連結" },
  "copied": { tr: "Kopyalandı", en: "Copied", es: "Copiado", pt_BR: "Copiado", de: "Kopiert", fr: "Copié", id: "Disalin", ja: "コピーしました", ko: "복사됨", zh_CN: "已复制", zh_TW: "已複製" },
  "empty": { tr: "Henüz gönderi yok. İlk paylaşan sen ol!", en: "No posts yet. Be the first to share!", es: "Aún no hay publicaciones. ¡Sé el primero!", pt_BR: "Ainda não há publicações. Seja o primeiro!", de: "Noch keine Beiträge. Sei der Erste!", fr: "Aucune publication pour l'instant. Soyez le premier !", id: "Belum ada postingan. Jadilah yang pertama!", ja: "まだ投稿がありません。最初の投稿をしよう！", ko: "아직 게시물이 없습니다. 첫 글을 남겨 보세요!", zh_CN: "还没有帖子，来发第一帖吧！", zh_TW: "還沒有貼文，來發第一篇吧！" },
  "loading": { tr: "Yükleniyor…", en: "Loading…", es: "Cargando…", pt_BR: "Carregando…", de: "Wird geladen…", fr: "Chargement…", id: "Memuat…", ja: "読み込み中…", ko: "불러오는 중…", zh_CN: "加载中…", zh_TW: "載入中…" },
  "err": { tr: "Bir şeyler ters gitti. Lütfen yeniden dene.", en: "Something went wrong. Please try again.", es: "Algo salió mal. Inténtalo de nuevo.", pt_BR: "Algo deu errado. Tente novamente.", de: "Etwas ist schiefgelaufen. Bitte versuche es erneut.", fr: "Une erreur s'est produite. Réessayez.", id: "Terjadi kesalahan. Coba lagi.", ja: "問題が発生しました。もう一度お試しください。", ko: "문제가 발생했습니다. 다시 시도해 주세요.", zh_CN: "出错了，请重试。", zh_TW: "發生錯誤，請重試。" },
  "limit": { tr: "Bugünlük paylaşım sınırına ulaştın (günde 5 gönderi, 60 yorum). Yarın yeniden dene.", en: "You've reached today's limit (5 posts, 60 comments a day). Try again tomorrow.", es: "Llegaste al límite de hoy (5 publicaciones y 60 comentarios al día). Vuelve mañana.", pt_BR: "Você atingiu o limite de hoje (5 publicações e 60 comentários por dia). Tente amanhã.", de: "Tageslimit erreicht (5 Beiträge, 60 Kommentare pro Tag). Versuche es morgen wieder.", fr: "Limite du jour atteinte (5 publications, 60 commentaires par jour). Réessayez demain.", id: "Batas hari ini tercapai (5 postingan, 60 komentar per hari). Coba lagi besok.", ja: "本日の上限に達しました（1日5投稿・60コメント）。明日またお試しください。", ko: "오늘 한도에 도달했습니다(하루 게시물 5개, 댓글 60개). 내일 다시 시도해 주세요.", zh_CN: "已达今日上限（每天 5 帖、60 条评论），请明天再试。", zh_TW: "已達今日上限（每天 5 篇、60 則留言），請明天再試。" },
  "img.err": { tr: "Görsel işlenemedi; başka bir görsel dene.", en: "Couldn't process the image; try another one.", es: "No se pudo procesar la imagen; prueba otra.", pt_BR: "Não foi possível processar a imagem; tente outra.", de: "Das Bild konnte nicht verarbeitet werden; versuche ein anderes.", fr: "Impossible de traiter l'image ; essayez-en une autre.", id: "Gambar gagal diproses; coba gambar lain.", ja: "画像を処理できませんでした。別の画像をお試しください。", ko: "이미지를 처리하지 못했습니다. 다른 이미지를 사용해 보세요.", zh_CN: "无法处理该图片，请换一张。", zh_TW: "無法處理這張圖片，請換一張。" },
  "rules": { tr: "Saygılı ol, kişisel bilgi paylaşma, reklam yapma. Bu kurallara uymayan gönderiler kaldırılır.", en: "Be respectful, don't share personal information and don't advertise. Posts that break these rules are removed.", es: "Sé respetuoso, no compartas datos personales ni hagas publicidad. Se eliminan las publicaciones que incumplan estas reglas.", pt_BR: "Seja respeitoso, não compartilhe dados pessoais nem faça propaganda. Publicações que violem essas regras são removidas.", de: "Sei respektvoll, teile keine persönlichen Daten und mach keine Werbung. Beiträge, die dagegen verstoßen, werden entfernt.", fr: "Soyez respectueux, ne partagez pas d'informations personnelles et ne faites pas de publicité. Les publications qui enfreignent ces règles sont retirées.", id: "Bersikaplah sopan, jangan bagikan data pribadi, dan jangan beriklan. Postingan yang melanggar akan dihapus.", ja: "礼儀を守り、個人情報の共有や宣伝はしないでください。ルール違反の投稿は削除されます。", ko: "서로 존중하고 개인정보 공유와 광고는 하지 마세요. 규칙을 어긴 게시물은 삭제됩니다.", zh_CN: "请互相尊重，不要分享个人信息或发布广告。违反规则的帖子将被删除。", zh_TW: "請互相尊重，不要分享個人資訊或發布廣告。違反規則的貼文將被刪除。" },
  "expire": { tr: "Gönderiler 30 gün sonra kendiliğinden silinir.", en: "Posts are deleted automatically after 30 days.", es: "Las publicaciones se eliminan automáticamente a los 30 días.", pt_BR: "As publicações são excluídas automaticamente após 30 dias.", de: "Beiträge werden nach 30 Tagen automatisch gelöscht.", fr: "Les publications sont supprimées automatiquement au bout de 30 jours.", id: "Postingan otomatis dihapus setelah 30 hari.", ja: "投稿は30日後に自動で削除されます。", ko: "게시물은 30일 후 자동으로 삭제됩니다.", zh_CN: "帖子将在 30 天后自动删除。", zh_TW: "貼文將在 30 天後自動刪除。" },
  "privacy": { tr: "Gizlilik", en: "Privacy", es: "Privacidad", pt_BR: "Privacidade", de: "Datenschutz", fr: "Confidentialité", id: "Privasi", ja: "プライバシー", ko: "개인정보", zh_CN: "隐私", zh_TW: "隱私" },
  "hidden": { tr: "Gizli (yalnız yönetici görür)", en: "Hidden (admins only)", es: "Oculta (solo administradores)", pt_BR: "Oculta (só administradores)", de: "Ausgeblendet (nur Admins)", fr: "Masquée (admins uniquement)", id: "Disembunyikan (hanya admin)", ja: "非表示（管理者のみ）", ko: "숨김(관리자만)", zh_CN: "已隐藏（仅管理员可见）", zh_TW: "已隱藏（僅管理員可見）" },
  "hide": { tr: "Gizle", en: "Hide", es: "Ocultar", pt_BR: "Ocultar", de: "Ausblenden", fr: "Masquer", id: "Sembunyikan", ja: "非表示", ko: "숨기기", zh_CN: "隐藏", zh_TW: "隱藏" },
  "unhide": { tr: "Göster", en: "Unhide", es: "Mostrar", pt_BR: "Mostrar", de: "Einblenden", fr: "Afficher", id: "Tampilkan", ja: "表示", ko: "표시", zh_CN: "取消隐藏", zh_TW: "取消隱藏" },
  "block": { tr: "Yazarı engelle", en: "Block author", es: "Bloquear autor", pt_BR: "Bloquear autor", de: "Autor sperren", fr: "Bloquer l'auteur", id: "Blokir penulis", ja: "投稿者をブロック", ko: "작성자 차단", zh_CN: "封禁作者", zh_TW: "封鎖作者" },
  "reports": { tr: "bildirim", en: "reports", es: "denuncias", pt_BR: "denúncias", de: "Meldungen", fr: "signalements", id: "laporan", ja: "件の報告", ko: "건 신고", zh_CN: "次举报", zh_TW: "次檢舉" },
  "more": { tr: "Devamı", en: "More", es: "Más", pt_BR: "Mais", de: "Mehr", fr: "Plus", id: "Selengkapnya", ja: "続きを読む", ko: "더 보기", zh_CN: "更多", zh_TW: "更多" },
};

const params = new URLSearchParams(location.search);
const EMU = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && params.get("emu") === "1";
const app = initializeApp({
  apiKey: "AIzaSyA4X01HBNqUiD2hGSQ6Sc9iSuH8H9zxcAE",
  // giriş penceresi panelin Hosting alanından açılır: Google OAuth istemcisinde kayıtlı yönlendirme adresi bu (firebaseapp.com değil)
  authDomain: "rebirth-panel-2eijd8.web.app",
  databaseURL: "https://dead-mans-deck-global-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dead-mans-deck-global",
  appId: "1:102593608481:web:88adee0bffe40ecc921c60",
});
const auth = getAuth(app);
const db = getDatabase(app);
if (EMU) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectDatabaseEmulator(db, "127.0.0.1", Number(params.get("emudb")) || 9000);
  // yalnız yerel emülatör sınaması: sahte Google hesabıyla giriş (açılır pencere engellenen tarayıcı panelinde)
  window.__tpDenemeGiris = (sub) => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email: sub + "@example.com", email_verified: true })));
}

let lang = D.sec();
let sira = (() => { try { return localStorage.getItem("rb_tp_sira") || "puan"; } catch (e) { return "puan"; } })();
let kullanici = null, takma = "", yonetici = false, oylarim = {}, bildirimler = {}, saatFarki = 0;
let gonderiler = [];
const acik = new Set();
const ceviri = {};   // pid / pid:cid → çevrilmiş metin gösteriliyor mu

const $ = (s, r) => (r || document).querySelector(s);
const t = (k) => { const v = S[k]; return v ? (v[lang] || v.en) : k; };
const el = (ad, sinif, metin) => { const e = document.createElement(ad); if (sinif) e.className = sinif; if (metin != null) e.textContent = metin; return e; };
const simdi = () => Date.now() + saatFarki;
const gunNo = () => String(Math.floor((simdi() + 10800000) / 86400000));
const dilAdi = (k) => (GONDERI_DILLERI.find((x) => x[0] === k) || [k, k])[1];

onValue(ref(db, ".info/serverTimeOffset"), (s) => { saatFarki = s.val() || 0; });

/* ------------------------------------------------------------------ dil */
function metinleriUygula() {
  D.uygula(lang);
  document.title = "ReBirth — " + t("title");
  document.querySelectorAll("[data-tt]").forEach((e) => { e.textContent = t(e.getAttribute("data-tt")); });
  document.querySelectorAll("a[data-keep-lang]").forEach((a) => { a.href = a.getAttribute("data-keep-lang") + "?lang=" + lang; });
  const f = $("#tpForm");
  f.etiket.innerHTML = "";
  ETIKETLER.forEach((e) => { const o = el("option", null, t("tag." + e)); o.value = e; f.etiket.appendChild(o); });
  const secili = f.dil.value || (GONDERI_DILLERI.some((x) => x[0] === lang) ? lang : "en");
  f.dil.innerHTML = "";
  GONDERI_DILLERI.forEach(([k, ad]) => { const o = el("option", null, ad); o.value = k; f.dil.appendChild(o); });
  f.dil.value = secili;
  f.metin.placeholder = t("f.text");
  siraUygula();
  kullaniciCiz();
  listeCiz();
}
const dilBtn = $("#docLang");
if (dilBtn) D.menu(dilBtn, lang, (k) => D.yukle(k, () => { lang = k; metinleriUygula(); }));

/* ------------------------------------------------------------------ giriş */
async function girisYap() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (e && /popup-blocked|operation-not-supported/.test(e.code || "")) await signInWithRedirect(auth, p);
    else if (!/popup-closed|cancelled-popup/.test((e && e.code) || "")) uyar(t("err"));
  }
}

getRedirectResult(auth).catch(() => {});   // açılır pencere engellenince yönlendirmeyle girenler
onAuthStateChanged(auth, async (u) => {
  kullanici = u; takma = ""; yonetici = false; oylarim = {}; bildirimler = {};
  if (u) {
    try {
      const [ad, oy, yon] = await Promise.all([get(ref(db, "topluluk_ad/" + u.uid)), get(ref(db, "topluluk_oy/" + u.uid)),
        get(ref(db, "topluluk_yonetici/" + u.uid))]);
      takma = ad.val() || "";
      oylarim = oy.val() || {};
      yonetici = yon.val() === true;
      if (yonetici) bildirimler = (await get(ref(db, "topluluk_bildir"))).val() || {};
    } catch (e) { /* okunamadıysa misafir gibi devam */ }
  }
  kullaniciCiz();
  yukle();
});

function kullaniciCiz() {
  const k = $("#tpUser");
  k.textContent = "";
  if (!kullanici) {
    const b = el("button", "doc-btn tp-google", t("signin"));
    b.type = "button";
    b.addEventListener("click", girisYap);
    k.appendChild(b);
    k.appendChild(el("span", "tp-hint", t("signin.why")));
    $("#tpCompose").hidden = true;
    return;
  }
  const ad = el("div", "tp-me");
  const etiket = el("label", "tp-nick");
  etiket.appendChild(el("span", null, t("nick")));
  const giris = el("input");
  giris.maxLength = 24; giris.minLength = 2; giris.value = takma; giris.placeholder = t("nick");
  etiket.appendChild(giris);
  const kaydet = el("button", "doc-btn doc-btn--ghost tp-small", t("save"));
  kaydet.type = "button";
  kaydet.addEventListener("click", async () => {
    const v = giris.value.trim().replace(/[<>&]/g, "");
    if (v.length < 2) { giris.focus(); return; }
    try { await update(ref(db), { ["topluluk_ad/" + kullanici.uid]: v }); takma = v; kaydet.textContent = "✓"; setTimeout(() => { kaydet.textContent = t("save"); }, 1500); }
    catch (e) { uyar(t("err")); }
  });
  etiket.appendChild(kaydet);
  ad.appendChild(etiket);
  ad.appendChild(el("small", "tp-hint", t("nick.hint")));
  k.appendChild(ad);
  const sag = el("div", "tp-me-btns");
  const yeni = el("button", "doc-btn", t("new"));
  yeni.type = "button";
  yeni.addEventListener("click", () => {
    if (!takma) { giris.focus(); giris.classList.add("tp-need"); return; }
    $("#tpCompose").hidden = false; $("#tpForm").baslik.focus();
  });
  const cik = el("button", "doc-btn doc-btn--ghost tp-small", t("signout"));
  cik.type = "button";
  cik.addEventListener("click", () => signOut(auth));
  sag.appendChild(yeni); sag.appendChild(cik);
  k.appendChild(sag);
}

/* ------------------------------------------------------------------ akış */
function siraUygula() {
  document.querySelectorAll("#tpSort button").forEach((b) => {
    const on = b.getAttribute("data-sira") === sira;
    b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on ? "true" : "false");
  });
}
$("#tpSort").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-sira]");
  if (!b) return;
  sira = b.getAttribute("data-sira");
  try { localStorage.setItem("rb_tp_sira", sira); } catch (err) {}
  siraUygula(); yukle();
});

async function yukle() {
  try {
    const s = await get(query(ref(db, "topluluk_gonderi"), orderByChild(sira), limitToLast(60)));
    const liste = [];
    s.forEach((c) => { liste.push(Object.assign({ id: c.key }, c.val())); });
    const sinir = simdi() - SAKLAMA_MS;
    gonderiler = liste.filter((p) => p.t >= sinir && (!p.gizli || yonetici));
    gonderiler.sort((a, b) => (b[sira] || 0) - (a[sira] || 0) || b.t - a.t);
    const derin = (location.hash.match(/^#p=([A-Za-z0-9_-]+)/) || [])[1];
    if (derin && !gonderiler.some((p) => p.id === derin)) {
      const d = await get(ref(db, "topluluk_gonderi/" + derin));
      if (d.exists() && d.val().t >= sinir && (!d.val().gizli || yonetici)) gonderiler.unshift(Object.assign({ id: derin }, d.val()));
    }
    if (derin) acik.add(derin);
    listeCiz();
    if (derin) { const a = document.getElementById("p-" + derin); if (a) a.scrollIntoView({ block: "start" }); }
  } catch (e) {
    $("#tpList").textContent = t("err");
  }
  temizle();
}

// süresi dolmuş en eski gönderileri (yorum ve görselleriyle) siler; kurallar 30 günü geçeni herkese açar
let temizlendi = false;
async function temizle() {
  if (temizlendi) return;
  temizlendi = true;
  try {
    const s = await get(query(ref(db, "topluluk_gonderi"), orderByChild("t"), endAt(simdi() - SAKLAMA_MS - 60000), limitToFirst(10)));
    const sil = {};
    s.forEach((c) => { sil["topluluk_gonderi/" + c.key] = null; sil["topluluk_yorum/" + c.key] = null; if (c.val().g) sil["topluluk_gorsel/" + c.key] = null; });
    if (Object.keys(sil).length) await update(ref(db), sil);
  } catch (e) { /* bir sonraki ziyaretçi dener */ }
}

function zamanMetni(ms) {
  const fark = (ms - simdi()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(D.html(lang), { numeric: "auto" });
  const a = Math.abs(fark);
  if (a < 60) return rtf.format(Math.round(fark), "second");
  if (a < 3600) return rtf.format(Math.round(fark / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(fark / 3600), "hour");
  return rtf.format(Math.round(fark / 86400), "day");
}

function listeCiz() {
  const k = $("#tpList");
  k.textContent = "";
  if (!gonderiler.length) { k.appendChild(el("p", "tp-empty", t("empty"))); return; }
  gonderiler.forEach((p) => k.appendChild(kart(p)));
}

function kart(p) {
  const a = el("article", "tp-post" + (acik.has(p.id) ? " is-open" : "") + (p.gizli ? " is-hidden" : ""));
  a.id = "p-" + p.id;
  // oy
  const oy = el("div", "tp-vote");
  const benim = oylarim[p.id] || 0;
  const yukari = el("button", "tp-up" + (benim === 1 ? " is-on" : ""), "▲");
  yukari.type = "button"; yukari.setAttribute("aria-label", "+1");
  const asagi = el("button", "tp-down" + (benim === -1 ? " is-on" : ""), "▼");
  asagi.type = "button"; asagi.setAttribute("aria-label", "-1");
  yukari.addEventListener("click", () => oyVer(p, 1));
  asagi.addEventListener("click", () => oyVer(p, -1));
  oy.appendChild(yukari); oy.appendChild(el("b", null, String(p.puan || 0))); oy.appendChild(asagi);
  a.appendChild(oy);
  // gövde
  const g = el("div", "tp-main");
  const ust = el("div", "tp-meta");
  ust.appendChild(el("span", "tp-tag tp-tag--" + p.etiket, t("tag." + p.etiket)));
  ust.appendChild(el("b", null, p.ad));
  const z = el("time", null, zamanMetni(p.t)); z.dateTime = new Date(p.t).toISOString();
  ust.appendChild(z);
  if (p.dil !== lang) ust.appendChild(el("span", "tp-lang", dilAdi(p.dil)));
  if (p.gizli) ust.appendChild(el("span", "tp-flag", t("hidden")));
  const bild = Object.keys(bildirimler[p.id] || {}).length;
  if (yonetici && bild) ust.appendChild(el("span", "tp-flag", bild + " " + t("reports")));
  g.appendChild(ust);
  const ceviriAcik = !!ceviri[p.id];
  const baslik = el("h2", "tp-title", ceviriAcik ? ceviri[p.id].baslik : p.baslik);
  baslik.addEventListener("click", () => ac(p.id));
  g.appendChild(baslik);
  if (p.metin) {
    const m = el("p", "tp-text", ceviriAcik ? ceviri[p.id].metin : p.metin);
    m.addEventListener("click", () => { if (!acik.has(p.id)) ac(p.id); });
    g.appendChild(m);
  }
  if (p.g) {
    const kutu = el("div", "tp-img");
    if (acik.has(p.id)) gorselYukle(p.id, kutu);
    else { const b = el("button", "tp-img-btn", "🖼 " + t("more")); b.type = "button"; b.addEventListener("click", () => ac(p.id)); kutu.appendChild(b); }
    g.appendChild(kutu);
  }
  // düğmeler
  const d = el("div", "tp-actions");
  const yorumBtn = el("button", null, "💬 " + (p.yorum || 0) + " " + t(new Intl.PluralRules(D.html(lang)).select(p.yorum || 0) === "one" ? "comment1" : "comments"));
  yorumBtn.type = "button";
  yorumBtn.addEventListener("click", () => ac(p.id));
  d.appendChild(yorumBtn);
  if (p.dil !== lang) {
    const c = el("button", null, ceviriAcik ? t("original") : t("translate"));
    c.type = "button";
    c.addEventListener("click", () => cevirGonderi(p, c));
    d.appendChild(c);
  }
  const pay = el("button", null, t("share"));
  pay.type = "button";
  pay.addEventListener("click", () => {
    const url = location.origin + location.pathname + "?lang=" + lang + "#p=" + p.id;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { pay.textContent = t("copied"); }, () => { window.prompt(t("share"), url); });
  });
  d.appendChild(pay);
  if (kullanici && p.u !== kullanici.uid) {
    const bl = el("button", null, t("report"));
    bl.type = "button";
    bl.addEventListener("click", async () => {
      try { await update(ref(db), { ["topluluk_bildir/" + p.id + "/" + kullanici.uid]: serverTimestamp() }); } catch (e) { /* zaten bildirilmiş */ }
      bl.textContent = t("reported"); bl.disabled = true;
    });
    d.appendChild(bl);
  }
  if (kullanici && (p.u === kullanici.uid || yonetici)) {
    const s = el("button", "tp-danger", t("delete"));
    s.type = "button";
    s.addEventListener("click", () => gonderiSil(p));
    d.appendChild(s);
  }
  if (yonetici) {
    const h = el("button", null, p.gizli ? t("unhide") : t("hide"));
    h.type = "button";
    h.addEventListener("click", async () => { try { await update(ref(db), { ["topluluk_gonderi/" + p.id + "/gizli"]: p.gizli ? null : true }); yukle(); } catch (e) { uyar(t("err")); } });
    d.appendChild(h);
    const e = el("button", "tp-danger", t("block"));
    e.type = "button";
    e.addEventListener("click", async () => { if (!confirm(t("block") + ": " + p.ad + "?")) return; try { await update(ref(db), { ["topluluk_engel/" + p.u]: true }); e.disabled = true; } catch (er) { uyar(t("err")); } });
    d.appendChild(e);
  }
  g.appendChild(d);
  // yorumlar
  if (acik.has(p.id)) {
    const y = el("div", "tp-comments");
    y.appendChild(el("p", "doc-meta", t("loading")));
    g.appendChild(y);
    yorumlariYukle(p, y);
  }
  a.appendChild(g);
  return a;
}

function ac(pid) {
  if (acik.has(pid)) acik.delete(pid); else acik.add(pid);
  const p = gonderiler.find((x) => x.id === pid);
  const eski = document.getElementById("p-" + pid);
  if (p && eski) eski.replaceWith(kart(p));
}

async function gorselYukle(pid, kutu) {
  try {
    const s = await get(ref(db, "topluluk_gorsel/" + pid));
    if (!s.exists()) return;
    const i = el("img");
    i.src = s.val(); i.alt = ""; i.loading = "lazy";
    i.addEventListener("click", () => window.open(i.src, "_blank"));
    kutu.textContent = ""; kutu.appendChild(i);
  } catch (e) { /* görselsiz göster */ }
}

async function yorumlariYukle(p, kutu) {
  let yorumlar = [];
  try {
    const s = await get(query(ref(db, "topluluk_yorum/" + p.id), orderByChild("t"), limitToLast(200)));
    s.forEach((c) => { yorumlar.push(Object.assign({ id: c.key }, c.val())); });
  } catch (e) { kutu.textContent = t("err"); return; }
  kutu.textContent = "";
  yorumlar.forEach((c) => {
    const s = el("div", "tp-comment");
    const ust = el("div", "tp-meta");
    ust.appendChild(el("b", null, c.ad));
    ust.appendChild(el("time", null, zamanMetni(c.t)));
    if (c.dil !== lang) ust.appendChild(el("span", "tp-lang", dilAdi(c.dil)));
    s.appendChild(ust);
    const anahtar = p.id + ":" + c.id;
    const m = el("p", null, ceviri[anahtar] || c.metin);
    s.appendChild(m);
    const d = el("div", "tp-actions tp-actions--s");
    if (c.dil !== lang) {
      const b = el("button", null, ceviri[anahtar] ? t("original") : t("translate"));
      b.type = "button";
      b.addEventListener("click", async () => {
        if (ceviri[anahtar]) { delete ceviri[anahtar]; m.textContent = c.metin; b.textContent = t("translate"); return; }
        const r = await cevir(c.metin, c.dil);
        if (r) { ceviri[anahtar] = r; m.textContent = r; b.textContent = t("original"); }
      });
      d.appendChild(b);
    }
    if (kullanici && (c.u === kullanici.uid || yonetici)) {
      const b = el("button", "tp-danger", t("delete"));
      b.type = "button";
      b.addEventListener("click", async () => {
        if (!confirm(t("delete.q"))) return;
        try { await update(ref(db), { ["topluluk_yorum/" + p.id + "/" + c.id]: null }); s.remove(); } catch (e) { uyar(t("err")); }
      });
      d.appendChild(b);
    }
    if (d.childNodes.length) s.appendChild(d);
    kutu.appendChild(s);
  });
  if (!kullanici) {
    const b = el("button", "doc-btn doc-btn--ghost tp-small", t("signin"));
    b.type = "button"; b.addEventListener("click", girisYap);
    kutu.appendChild(b);
    return;
  }
  const f = el("form", "tp-cform");
  const ta = el("textarea"); ta.rows = 2; ta.maxLength = 2000; ta.placeholder = t("comment.ph"); ta.required = true;
  const g = el("button", "doc-btn tp-small", t("send")); g.type = "submit";
  f.appendChild(ta); f.appendChild(g);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const metin = ta.value.trim();
    if (!metin) return;
    if (!takma) { uyar(t("nick")); return; }
    g.disabled = true;
    try {
      await yorumYaz(p, metin);
      p.yorum = (p.yorum || 0) + 1;
      const eski = document.getElementById("p-" + p.id);
      if (eski) eski.replaceWith(kart(p));
    } catch (er) { uyar(sinirHatasi(er)); g.disabled = false; }
  });
  kutu.appendChild(f);
}

/* ------------------------------------------------------------------ yazma */
function sinirHatasi(e) { return e && /PERMISSION_DENIED|permission/i.test(String(e.code || e.message)) ? t("limit") : t("err"); }

async function sayac(alan) {
  const s = await get(ref(db, "topluluk_sinir/" + kullanici.uid + "/" + gunNo() + "/" + alan));
  return s.val() || 0;
}

async function oyVer(p, v) {
  if (!kullanici) { girisYap(); return; }
  for (let deneme = 0; deneme < 3; deneme++) {
    const eski = oylarim[p.id] || 0;
    const yeni = eski === v ? 0 : v;
    const puan = (await get(ref(db, "topluluk_gonderi/" + p.id + "/puan"))).val() || 0;
    try {
      await update(ref(db), { ["topluluk_oy/" + kullanici.uid + "/" + p.id]: yeni || null, ["topluluk_gonderi/" + p.id + "/puan"]: puan + yeni - eski });
      if (yeni) oylarim[p.id] = yeni; else delete oylarim[p.id];
      p.puan = puan + yeni - eski;
      const k = document.getElementById("p-" + p.id);
      if (k) k.replaceWith(kart(p));
      return;
    } catch (e) { /* aynı anda başkası oy verdi: puanı yeniden oku */ }
  }
  uyar(t("err"));
}

async function yorumYaz(p, metin) {
  for (let deneme = 0; deneme < 3; deneme++) {
    const [say, n] = await Promise.all([get(ref(db, "topluluk_gonderi/" + p.id + "/yorum")), sayac("y")]);
    const cid = push(ref(db, "topluluk_yorum/" + p.id)).key;
    try {
      await update(ref(db), {
        ["topluluk_yorum/" + p.id + "/" + cid]: { u: kullanici.uid, ad: takma, metin: metin.slice(0, 2000), dil: yaziDili(metin), t: serverTimestamp() },
        ["topluluk_gonderi/" + p.id + "/yorum"]: (say.val() || 0) + 1,
        ["topluluk_sinir/" + kullanici.uid + "/" + gunNo() + "/y"]: n + 1,
      });
      return;
    } catch (e) { if (deneme === 2) throw e; }
  }
}

// yorumun dili: tarayıcı dil algılayıcısı yoksa sayfanın dili
function yaziDili() { return GONDERI_DILLERI.some((x) => x[0] === lang) ? lang : "en"; }

async function gonderiSil(p) {
  if (!confirm(t("delete.q"))) return;
  const sil = { ["topluluk_gonderi/" + p.id]: null, ["topluluk_yorum/" + p.id]: null };
  if (p.g) sil["topluluk_gorsel/" + p.id] = null;
  try { await update(ref(db), sil); gonderiler = gonderiler.filter((x) => x.id !== p.id); listeCiz(); } catch (e) { uyar(t("err")); }
}

/* gönderi formu */
const form = $("#tpForm");
let gorselVeri = null;
form.gorsel.addEventListener("change", async () => {
  gorselVeri = null;
  const on = $("#tpPreview");
  on.hidden = true; on.textContent = "";
  const f = form.gorsel.files && form.gorsel.files[0];
  if (!f) return;
  try {
    gorselVeri = await kucult(f);
    const i = el("img"); i.src = gorselVeri; on.appendChild(i);
    const x = el("button", "tp-x", "×"); x.type = "button";
    x.addEventListener("click", () => { gorselVeri = null; form.gorsel.value = ""; on.hidden = true; on.textContent = ""; });
    on.appendChild(x);
    on.hidden = false;
  } catch (e) { form.gorsel.value = ""; formHata(t("img.err")); }
});
$("#tpCancel").addEventListener("click", () => { form.reset(); gorselVeri = null; $("#tpPreview").hidden = true; $("#tpCompose").hidden = true; });
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formHata("");
  const baslik = form.baslik.value.trim(), metin = form.metin.value.trim();
  if (baslik.length < 3 || !kullanici || !takma) return;
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const n = await sayac("g");
    if (n >= 5) throw { code: "PERMISSION_DENIED" };
    const pid = push(ref(db, "topluluk_gonderi")).key;
    const veri = {
      ["topluluk_gonderi/" + pid]: { u: kullanici.uid, ad: takma, baslik: baslik.slice(0, 120), metin: metin.slice(0, 4000),
        etiket: form.etiket.value, dil: form.dil.value, t: serverTimestamp(), g: !!gorselVeri, puan: 0, yorum: 0 },
      ["topluluk_sinir/" + kullanici.uid + "/" + gunNo() + "/g"]: n + 1,
    };
    if (gorselVeri) veri["topluluk_gorsel/" + pid] = gorselVeri;
    await update(ref(db), veri);
    form.reset(); gorselVeri = null; $("#tpPreview").hidden = true; $("#tpCompose").hidden = true;
    sira = "t"; siraUygula(); acik.add(pid);
    await yukle();
  } catch (er) { formHata(sinirHatasi(er)); }
  btn.disabled = false;
});
function formHata(m) { const e = $("#tpFormErr"); e.textContent = m; e.hidden = !m; }

// görseli tarayıcıda küçült: en uzun kenar 1280 px, WebP (desteklenmezse JPEG), en çok GORSEL_EN_COK karakter
async function kucult(dosya) {
  const url = URL.createObjectURL(dosya);
  try {
    const i = await new Promise((ok, hata) => { const im = new Image(); im.onload = () => ok(im); im.onerror = hata; im.src = url; });
    let en = 1280;
    for (let tur = 0; tur < 6; tur++) {
      const o = Math.min(1, en / Math.max(i.naturalWidth, i.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(i.naturalWidth * o)); c.height = Math.max(1, Math.round(i.naturalHeight * o));
      c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
      for (const q of [0.82, 0.7, 0.58]) {
        let v = c.toDataURL("image/webp", q);
        if (!v.startsWith("data:image/webp")) v = c.toDataURL("image/jpeg", q);
        if (v.length <= GORSEL_EN_COK) return v;
      }
      en = Math.round(en * 0.75);
    }
    throw new Error("büyük");
  } finally { URL.revokeObjectURL(url); }
}

/* ------------------------------------------------------------------ çeviri */
// Chrome'un cihaz üstü çevirmeni (Translator API) varsa sayfada çevirir; yoksa Google Çeviri'de açar
const bcp = (k) => ({ pt_BR: "pt", zh_CN: "zh", zh_TW: "zh-Hant" })[k] || k;
async function cevir(metin, kaynak) {
  const hedef = bcp(lang), kay = bcp(kaynak);
  try {
    if ("Translator" in self) {
      const d = await self.Translator.availability({ sourceLanguage: kay, targetLanguage: hedef });
      if (d && d !== "unavailable") {
        const c = await self.Translator.create({ sourceLanguage: kay, targetLanguage: hedef });
        return await c.translate(metin);
      }
    }
  } catch (e) { /* Google Çeviri'ye düş */ }
  const g = { zh_CN: "zh-CN", zh_TW: "zh-TW", pt_BR: "pt" }[lang] || lang;
  window.open("https://translate.google.com/?sl=auto&tl=" + g + "&op=translate&text=" + encodeURIComponent(metin.slice(0, 4500)), "_blank", "noopener");
  return null;
}
async function cevirGonderi(p, btn) {
  if (ceviri[p.id]) { delete ceviri[p.id]; }
  else {
    btn.disabled = true;
    const b = await cevir(p.baslik, p.dil);
    if (b == null) { btn.disabled = false; return; }
    const m = p.metin ? await cevir(p.metin, p.dil) : "";
    ceviri[p.id] = { baslik: b, metin: m || p.metin };
  }
  const k = document.getElementById("p-" + p.id);
  if (k) k.replaceWith(kart(p));
}

function uyar(m) {
  let u = $("#tpToast");
  if (!u) { u = el("div", "tp-toast"); u.id = "tpToast"; u.setAttribute("role", "status"); document.body.appendChild(u); }
  u.textContent = m; u.classList.add("is-on");
  clearTimeout(uyar.z); uyar.z = setTimeout(() => u.classList.remove("is-on"), 3500);
}

D.yukle(lang, () => metinleriUygula());
window.addEventListener("hashchange", () => { const m = location.hash.match(/^#p=([A-Za-z0-9_-]+)/); if (m) { acik.add(m[1]); yukle(); } });
