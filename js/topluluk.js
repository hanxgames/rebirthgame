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
// içerik süzgeçleri: YenidenDogus/ajanlar/site/topluluk_kurallar.py BAGLANTI / TANITIM / KUFUR / AD_YASAK ile birebir (kurallar da reddeder)
const BAGLANTI = /(https?:|www\.|[a-z0-9]\.(com|net|org|io|gg|tr|me|ly|xyz|app|dev|co|tv|link|site|shop|ru|de|info|biz|online|store|live)[^a-z])/i;
const TANITIM = /(youtu|twitch|instagram|tiktok|discord|telegram|whatsapp|facebook|twitter|patreon|onlyfans|abone ol|abone olun|subscribe|follow me|takip et|kanalıma|kanalima|my channel)/i;
const KUFUR = /[^a-zçğıöşü](amk|amq|orospu|siktir|sikerim|sikeyim|sikik|sikim|yarrak|yarak|piç|pic kurusu|pezevenk|kahpe|ananı|anani|ananızı|gavat|ibne|kaltak|şerefsiz|serefsiz|fuck|shit|bitch|cunt|nigger|nigga|faggot|asshole|whore|slut|motherf|puta|mierda|cabrón|cabron|caralho|porra|foda-se|scheiße|scheisse|hurensohn|fotze|putain|merde|connard|salope|anjing|bangsat|kontol|memek|ngentot)/i;
const AD_YASAK = /(admin|y[oö]netici|moderat|[^a-z]mods?[^a-z]|hanx|leader|lider|official|resmi|staff|destek|support|rebirth|geli[sş]tirici|developer)/i;
const GONDERI_ARALIK = 60000, YORUM_ARALIK = 15000, OTO_GIZLE = 3;
// sorunlu metin için hata anahtarı (yoksa ""); yönetici muaf
function suzgec(metin) {
  if (yonetici) return "";
  const m = " " + metin + " ";
  if (BAGLANTI.test(m) || TANITIM.test(m)) return "f.link";
  if (KUFUR.test(m)) return "f.kufur";
  return "";
}
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
  "translating": { tr: "Çevriliyor…", en: "Translating…", es: "Traduciendo…", pt_BR: "Traduzindo…", de: "Wird übersetzt…", fr: "Traduction…", id: "Menerjemahkan…", ja: "翻訳中…", ko: "번역 중…", zh_CN: "翻译中…", zh_TW: "翻譯中…" },
  "original": { tr: "Aslını göster", en: "Show original", es: "Ver original", pt_BR: "Ver original", de: "Original anzeigen", fr: "Voir l'original", id: "Lihat asli", ja: "原文を表示", ko: "원문 보기", zh_CN: "显示原文", zh_TW: "顯示原文" },
  "report": { tr: "Bildir", en: "Report", es: "Denunciar", pt_BR: "Denunciar", de: "Melden", fr: "Signaler", id: "Laporkan", ja: "報告", ko: "신고", zh_CN: "举报", zh_TW: "檢舉" },
  "reported": { tr: "Bildirildi, teşekkürler", en: "Reported, thanks", es: "Denunciado, gracias", pt_BR: "Denunciado, obrigado", de: "Gemeldet, danke", fr: "Signalé, merci", id: "Dilaporkan, terima kasih", ja: "報告しました", ko: "신고했습니다", zh_CN: "已举报，谢谢", zh_TW: "已檢舉，謝謝" },
  "delete": { tr: "Sil", en: "Delete", es: "Eliminar", pt_BR: "Excluir", de: "Löschen", fr: "Supprimer", id: "Hapus", ja: "削除", ko: "삭제", zh_CN: "删除", zh_TW: "刪除" },
  "delete.q": { tr: "Silinsin mi? Bu geri alınamaz.", en: "Delete this? It can't be undone.", es: "¿Eliminar? No se puede deshacer.", pt_BR: "Excluir? Não pode ser desfeito.", de: "Löschen? Das kann nicht rückgängig gemacht werden.", fr: "Supprimer ? C'est définitif.", id: "Hapus? Tidak bisa dibatalkan.", ja: "削除しますか？元に戻せません。", ko: "삭제할까요? 되돌릴 수 없습니다.", zh_CN: "确定删除？此操作无法撤销。", zh_TW: "確定刪除？此操作無法復原。" },
  "share": { tr: "Bağlantıyı kopyala", en: "Copy link", es: "Copiar enlace", pt_BR: "Copiar link", de: "Link kopieren", fr: "Copier le lien", id: "Salin tautan", ja: "リンクをコピー", ko: "링크 복사", zh_CN: "复制链接", zh_TW: "複製連結" },
  "sharepost": { tr: "Paylaş", en: "Share", es: "Compartir", pt_BR: "Compartilhar", de: "Teilen", fr: "Partager", id: "Bagikan", ja: "シェア", ko: "공유", zh_CN: "分享", zh_TW: "分享" },
  "sharetitle": { tr: "Gönderiyi paylaş", en: "Share this post", es: "Compartir publicación", pt_BR: "Compartilhar publicação", de: "Beitrag teilen", fr: "Partager la publication", id: "Bagikan postingan", ja: "投稿をシェア", ko: "게시물 공유", zh_CN: "分享帖子", zh_TW: "分享貼文" },
  "sharemore": { tr: "Toplulukta tartış", en: "Join the discussion at", es: "Únete a la conversación en", pt_BR: "Participe da conversa em", de: "Diskutiere mit auf", fr: "Rejoignez la discussion sur", id: "Ikut berdiskusi di", ja: "コミュニティで語ろう", ko: "커뮤니티에서 이야기해요", zh_CN: "来社区一起讨论", zh_TW: "來社群一起討論" },
  "theme": { tr: "Topluluk", en: "Community", es: "Comunidad", pt_BR: "Comunidade", de: "Community", fr: "Communauté", id: "Komunitas", ja: "コミュニティ", ko: "커뮤니티", zh_CN: "社区", zh_TW: "社群" },
  "copied": { tr: "Kopyalandı", en: "Copied", es: "Copiado", pt_BR: "Copiado", de: "Kopiert", fr: "Copié", id: "Disalin", ja: "コピーしました", ko: "복사됨", zh_CN: "已复制", zh_TW: "已複製" },
  "empty": { tr: "Henüz gönderi yok. İlk paylaşan sen ol!", en: "No posts yet. Be the first to share!", es: "Aún no hay publicaciones. ¡Sé el primero!", pt_BR: "Ainda não há publicações. Seja o primeiro!", de: "Noch keine Beiträge. Sei der Erste!", fr: "Aucune publication pour l'instant. Soyez le premier !", id: "Belum ada postingan. Jadilah yang pertama!", ja: "まだ投稿がありません。最初の投稿をしよう！", ko: "아직 게시물이 없습니다. 첫 글을 남겨 보세요!", zh_CN: "还没有帖子，来发第一帖吧！", zh_TW: "還沒有貼文，來發第一篇吧！" },
  "loading": { tr: "Yükleniyor…", en: "Loading…", es: "Cargando…", pt_BR: "Carregando…", de: "Wird geladen…", fr: "Chargement…", id: "Memuat…", ja: "読み込み中…", ko: "불러오는 중…", zh_CN: "加载中…", zh_TW: "載入中…" },
  "err": { tr: "Bir şeyler ters gitti. Lütfen yeniden dene.", en: "Something went wrong. Please try again.", es: "Algo salió mal. Inténtalo de nuevo.", pt_BR: "Algo deu errado. Tente novamente.", de: "Etwas ist schiefgelaufen. Bitte versuche es erneut.", fr: "Une erreur s'est produite. Réessayez.", id: "Terjadi kesalahan. Coba lagi.", ja: "問題が発生しました。もう一度お試しください。", ko: "문제가 발생했습니다. 다시 시도해 주세요.", zh_CN: "出错了，请重试。", zh_TW: "發生錯誤，請重試。" },
  "limit": { tr: "Bugünlük paylaşım sınırına ulaştın (günde 5 gönderi, 60 yorum). Yarın yeniden dene.", en: "You've reached today's limit (5 posts, 60 comments a day). Try again tomorrow.", es: "Llegaste al límite de hoy (5 publicaciones y 60 comentarios al día). Vuelve mañana.", pt_BR: "Você atingiu o limite de hoje (5 publicações e 60 comentários por dia). Tente amanhã.", de: "Tageslimit erreicht (5 Beiträge, 60 Kommentare pro Tag). Versuche es morgen wieder.", fr: "Limite du jour atteinte (5 publications, 60 commentaires par jour). Réessayez demain.", id: "Batas hari ini tercapai (5 postingan, 60 komentar per hari). Coba lagi besok.", ja: "本日の上限に達しました（1日5投稿・60コメント）。明日またお試しください。", ko: "오늘 한도에 도달했습니다(하루 게시물 5개, 댓글 60개). 내일 다시 시도해 주세요.", zh_CN: "已达今日上限（每天 5 帖、60 条评论），请明天再试。", zh_TW: "已達今日上限（每天 5 篇、60 則留言），請明天再試。" },
  "img.err": { tr: "Görsel işlenemedi; başka bir görsel dene.", en: "Couldn't process the image; try another one.", es: "No se pudo procesar la imagen; prueba otra.", pt_BR: "Não foi possível processar a imagem; tente outra.", de: "Das Bild konnte nicht verarbeitet werden; versuche ein anderes.", fr: "Impossible de traiter l'image ; essayez-en une autre.", id: "Gambar gagal diproses; coba gambar lain.", ja: "画像を処理できませんでした。別の画像をお試しください。", ko: "이미지를 처리하지 못했습니다. 다른 이미지를 사용해 보세요.", zh_CN: "无法处理该图片，请换一张。", zh_TW: "無法處理這張圖片，請換一張。" },
  "rules": { tr: "Kurallar: saygılı ol; küfür, hakaret ve nefret söylemi yasak; spam ve aynı içeriği tekrar tekrar paylaşmak yasak; bağlantı, sosyal medya adresi ve tanıtım (self promotion) yasak; kişisel bilgi paylaşma; yetkili taklidi yapma. Kurallara uymayan gönderiler kaldırılır, hesap engellenir. 3 kişinin bildirdiği gönderi incelenene dek gizlenir.", en: "Rules: be respectful; no profanity, insults or hate speech; no spam or repeated posts; no links, social media handles or self-promotion; don't share personal information; don't impersonate staff. Posts that break the rules are removed and accounts blocked. A post reported by 3 people is hidden until reviewed.", es: "Reglas: sé respetuoso; nada de insultos, groserías ni odio; nada de spam ni publicaciones repetidas; nada de enlaces, redes sociales ni autopromoción; no compartas datos personales; no te hagas pasar por el equipo. Se eliminan las publicaciones que incumplan las reglas y se bloquean las cuentas. Una publicación denunciada por 3 personas se oculta hasta su revisión.", pt_BR: "Regras: seja respeitoso; sem palavrões, insultos ou discurso de ódio; sem spam ou publicações repetidas; sem links, redes sociais ou autopromoção; não compartilhe dados pessoais; não se passe pela equipe. Publicações que violem as regras são removidas e as contas bloqueadas. Uma publicação denunciada por 3 pessoas fica oculta até ser revisada.", de: "Regeln: Sei respektvoll; keine Beleidigungen, Schimpfwörter oder Hassrede; kein Spam und keine wiederholten Beiträge; keine Links, Social-Media-Hinweise oder Eigenwerbung; keine persönlichen Daten; gib dich nicht als Team aus. Verstöße werden entfernt und Konten gesperrt. Ein von 3 Personen gemeldeter Beitrag wird bis zur Prüfung ausgeblendet.", fr: "Règles : soyez respectueux ; pas d'insultes, de grossièretés ni de propos haineux ; pas de spam ni de publications répétées ; pas de liens, de réseaux sociaux ni d'autopromotion ; ne partagez pas d'informations personnelles ; ne vous faites pas passer pour l'équipe. Les publications non conformes sont retirées et les comptes bloqués. Une publication signalée par 3 personnes est masquée jusqu'à son examen.", id: "Aturan: bersikap sopan; dilarang kata kasar, hinaan, atau ujaran kebencian; dilarang spam atau posting berulang; dilarang tautan, akun media sosial, atau promosi diri; jangan bagikan data pribadi; jangan menyamar sebagai staf. Postingan yang melanggar dihapus dan akunnya diblokir. Postingan yang dilaporkan 3 orang disembunyikan sampai ditinjau.", ja: "ルール：礼儀を守ること。暴言・侮辱・ヘイト、スパムや同じ内容の繰り返し、リンク・SNSアカウント・宣伝、個人情報の共有、運営のなりすましは禁止です。違反した投稿は削除され、アカウントはブロックされます。3人から報告された投稿は確認まで非表示になります。", ko: "규칙: 서로 존중하세요. 욕설·모욕·혐오 발언, 스팸과 같은 내용 반복 게시, 링크·SNS 계정·홍보, 개인정보 공유, 운영진 사칭은 금지입니다. 규칙을 어긴 게시물은 삭제되고 계정은 차단됩니다. 3명이 신고한 게시물은 검토 전까지 숨겨집니다.", zh_CN: "规则：互相尊重；禁止脏话、辱骂和仇恨言论；禁止刷屏和重复发帖；禁止链接、社交媒体账号和自我推广；不要分享个人信息；不要冒充官方。违规帖子将被删除，账号将被封禁。被 3 人举报的帖子在审核前会被隐藏。", zh_TW: "規則：互相尊重；禁止髒話、辱罵和仇恨言論；禁止洗版和重複發文；禁止連結、社群帳號和自我推廣；不要分享個人資訊；不要冒充官方。違規貼文將被刪除，帳號將被封鎖。被 3 人檢舉的貼文在審核前會被隱藏。" },
  "expire": { tr: "Gönderiler 30 gün sonra kendiliğinden silinir.", en: "Posts are deleted automatically after 30 days.", es: "Las publicaciones se eliminan automáticamente a los 30 días.", pt_BR: "As publicações são excluídas automaticamente após 30 dias.", de: "Beiträge werden nach 30 Tagen automatisch gelöscht.", fr: "Les publications sont supprimées automatiquement au bout de 30 jours.", id: "Postingan otomatis dihapus setelah 30 hari.", ja: "投稿は30日後に自動で削除されます。", ko: "게시물은 30일 후 자동으로 삭제됩니다.", zh_CN: "帖子将在 30 天后自动删除。", zh_TW: "貼文將在 30 天後自動刪除。" },
  "privacy": { tr: "Gizlilik", en: "Privacy", es: "Privacidad", pt_BR: "Privacidade", de: "Datenschutz", fr: "Confidentialité", id: "Privasi", ja: "プライバシー", ko: "개인정보", zh_CN: "隐私", zh_TW: "隱私" },
  "hidden": { tr: "Gizli (yalnız yönetici görür)", en: "Hidden (admins only)", es: "Oculta (solo administradores)", pt_BR: "Oculta (só administradores)", de: "Ausgeblendet (nur Admins)", fr: "Masquée (admins uniquement)", id: "Disembunyikan (hanya admin)", ja: "非表示（管理者のみ）", ko: "숨김(관리자만)", zh_CN: "已隐藏（仅管理员可见）", zh_TW: "已隱藏（僅管理員可見）" },
  "hide": { tr: "Gizle", en: "Hide", es: "Ocultar", pt_BR: "Ocultar", de: "Ausblenden", fr: "Masquer", id: "Sembunyikan", ja: "非表示", ko: "숨기기", zh_CN: "隐藏", zh_TW: "隱藏" },
  "unhide": { tr: "Göster", en: "Unhide", es: "Mostrar", pt_BR: "Mostrar", de: "Einblenden", fr: "Afficher", id: "Tampilkan", ja: "表示", ko: "표시", zh_CN: "取消隐藏", zh_TW: "取消隱藏" },
  "block": { tr: "Yazarı engelle", en: "Block author", es: "Bloquear autor", pt_BR: "Bloquear autor", de: "Autor sperren", fr: "Bloquer l'auteur", id: "Blokir penulis", ja: "投稿者をブロック", ko: "작성자 차단", zh_CN: "封禁作者", zh_TW: "封鎖作者" },
  "reports": { tr: "bildirim", en: "reports", es: "denuncias", pt_BR: "denúncias", de: "Meldungen", fr: "signalements", id: "laporan", ja: "件の報告", ko: "건 신고", zh_CN: "次举报", zh_TW: "次檢舉" },
  "nick.bad": { tr: "Bu takma ad kullanılamaz (yetkili adları, bağlantı ve uygunsuz ifadeler yasak).", en: "You can't use this nickname (staff names, links and offensive words aren't allowed).", es: "No puedes usar este apodo (no se permiten nombres de staff, enlaces ni palabras ofensivas).", pt_BR: "Você não pode usar este apelido (nomes da equipe, links e palavras ofensivas não são permitidos).", de: "Dieser Spitzname ist nicht erlaubt (keine Team-Namen, Links oder beleidigenden Wörter).", fr: "Ce pseudo n'est pas autorisé (noms de l'équipe, liens et mots offensants interdits).", id: "Nama panggilan ini tidak bisa dipakai (nama staf, tautan, dan kata kasar dilarang).", ja: "このニックネームは使用できません（運営を名乗る名前、リンク、不適切な言葉は禁止）。", ko: "이 닉네임은 사용할 수 없습니다(운영진 사칭, 링크, 욕설 금지).", zh_CN: "无法使用此昵称（禁止冒充官方、链接和不当用语）。", zh_TW: "無法使用此暱稱（禁止冒充官方、連結和不當用語）。" },
  "f.link": { tr: "Bağlantı, sosyal medya adresi ve tanıtım paylaşılamaz.", en: "Links, social media handles and self-promotion aren't allowed.", es: "No se permiten enlaces, redes sociales ni autopromoción.", pt_BR: "Links, redes sociais e autopromoção não são permitidos.", de: "Links, Social-Media-Hinweise und Eigenwerbung sind nicht erlaubt.", fr: "Les liens, réseaux sociaux et l'autopromotion sont interdits.", id: "Tautan, akun media sosial, dan promosi diri tidak diperbolehkan.", ja: "リンク、SNSアカウント、宣伝は投稿できません。", ko: "링크, SNS 계정, 홍보는 올릴 수 없습니다.", zh_CN: "禁止发布链接、社交媒体账号和自我推广。", zh_TW: "禁止發布連結、社群帳號和自我推廣。" },
  "f.kufur": { tr: "Mesajın uygunsuz bir ifade içeriyor. Lütfen düzelt.", en: "Your message contains offensive language. Please edit it.", es: "Tu mensaje contiene lenguaje ofensivo. Corrígelo, por favor.", pt_BR: "Sua mensagem contém linguagem ofensiva. Edite-a, por favor.", de: "Deine Nachricht enthält beleidigende Sprache. Bitte ändere sie.", fr: "Votre message contient des propos offensants. Merci de le modifier.", id: "Pesanmu mengandung kata kasar. Silakan ubah.", ja: "不適切な表現が含まれています。修正してください。", ko: "부적절한 표현이 포함되어 있습니다. 수정해 주세요.", zh_CN: "你的内容包含不当用语，请修改。", zh_TW: "你的內容包含不當用語，請修改。" },
  "fast": { tr: "Çok hızlı paylaşıyorsun. Gönderiler arasında 1 dakika, yorumlar arasında 15 saniye bekle.", en: "You're posting too fast. Wait 1 minute between posts and 15 seconds between comments.", es: "Publicas demasiado rápido. Espera 1 minuto entre publicaciones y 15 segundos entre comentarios.", pt_BR: "Você está publicando rápido demais. Espere 1 minuto entre publicações e 15 segundos entre comentários.", de: "Zu schnell. Warte 1 Minute zwischen Beiträgen und 15 Sekunden zwischen Kommentaren.", fr: "Vous publiez trop vite. Attendez 1 minute entre les publications et 15 secondes entre les commentaires.", id: "Terlalu cepat. Tunggu 1 menit antarpostingan dan 15 detik antarkomentar.", ja: "投稿が速すぎます。投稿は1分、コメントは15秒あけてください。", ko: "너무 빨리 올리고 있습니다. 게시물은 1분, 댓글은 15초 간격을 두세요.", zh_CN: "发得太快了。发帖间隔 1 分钟，评论间隔 15 秒。", zh_TW: "發得太快了。發文間隔 1 分鐘，留言間隔 15 秒。" },
  "up": { tr: "Beğen", en: "Upvote", es: "Me gusta", pt_BR: "Curtir", de: "Gefällt mir", fr: "J'aime", id: "Suka", ja: "いいね", ko: "추천", zh_CN: "赞", zh_TW: "讚" },
  "down": { tr: "Beğenme", en: "Downvote", es: "No me gusta", pt_BR: "Não curtir", de: "Gefällt mir nicht", fr: "Je n'aime pas", id: "Tidak suka", ja: "よくないね", ko: "비추천", zh_CN: "踩", zh_TW: "倒讚" },
  "pinned": { tr: "Sabitlendi", en: "Pinned", es: "Fijado", pt_BR: "Fixado", de: "Angepinnt", fr: "Épinglé", id: "Disematkan", ja: "固定", ko: "고정됨", zh_CN: "置顶", zh_TW: "置頂" },
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
    if (!yonetici && (AD_YASAK.test(" " + v + " ") || suzgec(v))) { uyar(t("nick.bad")); giris.focus(); return; }
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
    gonderiler = liste.filter((p) => (p.t >= sinir || p.sabit) && ((!p.gizli && (p.b || 0) < OTO_GIZLE) || yonetici));
    // sabit gönderi (yalnız yönetici koyar) her sıralamada en üstte; sıralama sorgusu onu getirmezse ayrıca okunur
    if (!gonderiler.some((p) => p.sabit)) {
      const sb = await get(query(ref(db, "topluluk_gonderi"), orderByChild("sabit"), endAt(true), limitToLast(3)));
      sb.forEach((c) => { if (c.val().sabit === true && !c.val().gizli) gonderiler.push(Object.assign({ id: c.key }, c.val())); });
    }
    gonderiler.sort((a, b) => (b.sabit === true) - (a.sabit === true) || (b[sira] || 0) - (a[sira] || 0) || b.t - a.t);
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
    s.forEach((c) => { if (c.val().sabit) return; sil["topluluk_gonderi/" + c.key] = null; sil["topluluk_yorum/" + c.key] = null; if (c.val().g) sil["topluluk_gorsel/" + c.key] = null; });
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
  const a = el("article", "tp-post" + (acik.has(p.id) ? " is-open" : "") + (p.gizli ? " is-hidden" : "") + (p.sabit ? " is-pinned" : ""));
  a.id = "p-" + p.id;
  // oy
  const benim = oylarim[p.id] || 0;
  const oy = el("div", "tp-vote" + (benim === 1 ? " is-up" : benim === -1 ? " is-down" : ""));
  const OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 3 14h6v6h6v-6h6z"/></svg>';
  const yukari = el("button", "tp-up" + (benim === 1 ? " is-on" : ""));
  yukari.type = "button"; yukari.innerHTML = OK; yukari.title = t("up"); yukari.setAttribute("aria-label", t("up")); yukari.setAttribute("aria-pressed", benim === 1);
  const asagi = el("button", "tp-down" + (benim === -1 ? " is-on" : ""));
  asagi.type = "button"; asagi.innerHTML = OK; asagi.title = t("down"); asagi.setAttribute("aria-label", t("down")); asagi.setAttribute("aria-pressed", benim === -1);
  yukari.addEventListener("click", () => oyVer(p, 1));
  asagi.addEventListener("click", () => oyVer(p, -1));
  oy.appendChild(yukari); oy.appendChild(el("b", null, String(p.puan || 0))); oy.appendChild(asagi);
  a.appendChild(oy);
  // gövde
  const g = el("div", "tp-main");
  const ust = el("div", "tp-meta");
  ust.appendChild(el("span", "tp-tag tp-tag--" + p.etiket, t("tag." + p.etiket)));
  ust.appendChild(adEtiketi(p));
  const z = el("time", null, zamanMetni(p.t)); z.dateTime = new Date(p.t).toISOString();
  ust.appendChild(z);
  if (p.dil !== lang) ust.appendChild(el("span", "tp-lang", dilAdi(p.dil)));
  if (p.sabit) ust.appendChild(el("span", "tp-pin", "📌 " + t("pinned")));
  if (p.gizli) ust.appendChild(el("span", "tp-flag", t("hidden")));
  const bild = Math.max(Object.keys(bildirimler[p.id] || {}).length, p.b || 0);
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
  const pay = el("button", null, "↗ " + t("sharepost"));
  pay.type = "button"; pay.setAttribute("aria-haspopup", "dialog");
  pay.addEventListener("click", () => paylas(p, pay));
  d.appendChild(pay);
  if (kullanici && p.u !== kullanici.uid) {
    const bl = el("button", null, t("report"));
    bl.type = "button";
    bl.addEventListener("click", async () => {
      try {
        const b = (await get(ref(db, "topluluk_gonderi/" + p.id + "/b"))).val() || 0;
        await update(ref(db), { ["topluluk_bildir/" + p.id + "/" + kullanici.uid]: serverTimestamp(), ["topluluk_gonderi/" + p.id + "/b"]: b + 1 });
      } catch (e) { /* zaten bildirilmiş */ }
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

// paylaşım penceresi (js/paylas.js, haberlerle aynı): hikâye 9:16 ve gönderi 4:5 görseli. Gönderinin görseli varsa o,
// yoksa oyun haritası üstünde "Topluluk" kapağı. Metin ekranda görünen hâli (çevrildiyse çevirisi).
async function paylas(p, btn) {
  if (!window.RBPaylas || !window.RBPaylas.ac) return;
  btn.disabled = true;
  let gorsel = null;
  if (p.g) { try { const s = await get(ref(db, "topluluk_gorsel/" + p.id)); if (s.exists()) gorsel = s.val(); } catch (e) { /* temayla */ } }
  btn.disabled = false;
  const c = ceviri[p.id], tek = (x) => ({ [lang]: x || "" }), z = new Date(p.t || Date.now()), iki = (n) => String(n).padStart(2, "0");
  window.RBPaylas.ac({
    id: "topluluk-" + p.id,
    etiket: tek(t("tag." + p.etiket)), renk: p.etiket === "hata" ? { etiket: "#d8483b" } : null,
    baslik: tek(c ? c.baslik : p.baslik), ozet: tek(c ? c.metin : p.metin), dil: c ? lang : p.dil,
    tarih: z.getFullYear() + "-" + iki(z.getMonth() + 1) + "-" + iki(z.getDate()),
    yazar: p.ad, yazarRenk: p.r === "leader" ? "#ff4d3d" : null,
    gorsel, tema: gorsel ? null : t("theme"),
    url: "https://rebirthgame.tr/topluluk.html?lang=" + lang + "#p=" + p.id,
    pencere: t("sharetitle"), alt: t("sharemore")
  }, lang, btn);
}

// yazar adı: yönetici rozeti (r: "leader", kurallar yalnız yöneticiye izin verir) kırmızı ad + LEADER
function adEtiketi(x) {
  const k = el("span", "tp-author" + (x.r === "leader" ? " tp-leader" : ""));
  k.appendChild(el("b", null, x.ad));
  if (x.r === "leader") k.appendChild(el("span", "tp-flair", "LEADER"));
  return k;
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
    ust.appendChild(adEtiketi(c));
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
        b.disabled = true; b.textContent = t("translating");
        const r = await cevir(c.metin, c.dil);
        b.disabled = false;
        if (r) { ceviri[anahtar] = r; m.textContent = r; b.textContent = t("original"); }
        else { b.textContent = t("translate"); uyar(t("err")); }
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
    const sz = suzgec(metin);
    if (sz) { uyar(t(sz)); return; }
    if (!yonetici && Date.now() - sonYorum < YORUM_ARALIK) { uyar(t("fast")); return; }
    g.disabled = true;
    try {
      await yorumYaz(p, metin);
      sonYorum = Date.now();
      p.yorum = (p.yorum || 0) + 1;
      const eski = document.getElementById("p-" + p.id);
      if (eski) eski.replaceWith(kart(p));
    } catch (er) { uyar(sinirHatasi(er)); g.disabled = false; }
  });
  kutu.appendChild(f);
}

/* ------------------------------------------------------------------ yazma */
let sonGonderi = 0, sonYorum = 0;
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
        ["topluluk_yorum/" + p.id + "/" + cid]: Object.assign({ u: kullanici.uid, ad: takma, metin: metin.slice(0, 2000), dil: yaziDili(metin), t: serverTimestamp() },
          yonetici ? { r: "leader" } : {}),
        ["topluluk_sinir/" + kullanici.uid + "/son_y"]: serverTimestamp(),
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
  const sz = suzgec(baslik + " " + metin);
  if (sz) { formHata(t(sz)); return; }
  if (!yonetici && Date.now() - sonGonderi < GONDERI_ARALIK) { formHata(t("fast")); return; }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const n = await sayac("g");
    if (n >= 5) throw { code: "PERMISSION_DENIED" };
    const pid = push(ref(db, "topluluk_gonderi")).key;
    const veri = {
      ["topluluk_gonderi/" + pid]: Object.assign({ u: kullanici.uid, ad: takma, baslik: baslik.slice(0, 120), metin: metin.slice(0, 4000),
        etiket: form.etiket.value, dil: form.dil.value, t: serverTimestamp(), g: !!gorselVeri, puan: 0, yorum: 0 }, yonetici ? { r: "leader" } : {}),
      ["topluluk_sinir/" + kullanici.uid + "/son_g"]: serverTimestamp(),
      ["topluluk_sinir/" + kullanici.uid + "/" + gunNo() + "/g"]: n + 1,
    };
    if (gorselVeri) veri["topluluk_gorsel/" + pid] = gorselVeri;
    await update(ref(db), veri);
    sonGonderi = Date.now();
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
// Sayfanın içinde çevirir (yeni sekme yok): 1) Chrome'un cihaz üstü çevirmeni (Translator API), 2) Google Çeviri'nin web uç noktası
// (anahtarsız, CORS açık), 3) MyMemory (ücretsiz). Hepsi başarısızsa null → uyarı.
const bcp = (k) => ({ pt_BR: "pt", zh_CN: "zh", zh_TW: "zh-Hant" })[k] || k;
const gkod = (k) => ({ zh_CN: "zh-CN", zh_TW: "zh-TW", pt_BR: "pt" })[k] || k;
function parcala(metin, en) {   // paragraf/cümle sınırından en çok `en` karakterlik parçalar
  const out = [];
  let kalan = metin;
  while (kalan.length > en) {
    let i = Math.max(kalan.lastIndexOf("\n", en), kalan.lastIndexOf(". ", en));
    if (i < en / 3) i = en;
    out.push(kalan.slice(0, i + 1)); kalan = kalan.slice(i + 1);
  }
  if (kalan) out.push(kalan);
  return out;
}
async function cevirGoogle(metin, kaynak) {
  let sonuc = "";
  for (const p of parcala(metin, 1800)) {
    const r = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=" + gkod(kaynak) + "&tl=" + gkod(lang) + "&q=" + encodeURIComponent(p));
    if (!r.ok) throw new Error("gtx " + r.status);
    const j = await r.json();
    sonuc += (j[0] || []).map((x) => x[0]).join("");
  }
  return sonuc;
}
async function cevirMyMemory(metin, kaynak) {
  let sonuc = "";
  for (const p of parcala(metin, 450)) {
    const r = await fetch("https://api.mymemory.translated.net/get?langpair=" + gkod(kaynak) + "|" + gkod(lang) + "&q=" + encodeURIComponent(p));
    const j = await r.json();
    if (!j || j.responseStatus !== 200) throw new Error("mymemory");
    sonuc += j.responseData.translatedText + (/\n$/.test(p) ? "\n" : " ");
  }
  return sonuc.trim();
}
async function cevir(metin, kaynak) {
  if (!metin) return "";
  try {
    if ("Translator" in self) {
      const d = await self.Translator.availability({ sourceLanguage: bcp(kaynak), targetLanguage: bcp(lang) });
      if (d && d !== "unavailable") {
        const c = await self.Translator.create({ sourceLanguage: bcp(kaynak), targetLanguage: bcp(lang) });
        return await c.translate(metin);
      }
    }
  } catch (e) { /* sonrakine geç */ }
  try { return await cevirGoogle(metin, kaynak); } catch (e) { /* sonrakine geç */ }
  try { return await cevirMyMemory(metin, kaynak); } catch (e) { /* çevrilemedi */ }
  return null;
}
async function cevirGonderi(p, btn) {
  if (ceviri[p.id]) { delete ceviri[p.id]; }
  else {
    btn.disabled = true;
    btn.textContent = t("translating");
    const [b, m] = await Promise.all([cevir(p.baslik, p.dil), cevir(p.metin || "", p.dil)]);
    if (b == null) { btn.disabled = false; btn.textContent = t("translate"); uyar(t("err")); return; }
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
