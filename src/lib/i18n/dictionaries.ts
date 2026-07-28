import type { Locale } from "./locales";

export interface Dictionary {
  nav: {
    home: string;
    portal: string;
    tasks: string;
    interfaces: string;
    learningCenter: string;
  };
  home: {
    pipesTab: string;
    databasesTab: string;
    createPipeTile: string;
    cardsCountOne: string;
    cardsCountOther: string;
  };
  createPipe: {
    title: string;
    searchPlaceholder: string;
    templatesHeading: string;
    categoriesHeading: string;
    createFromScratch: string;
    createWithAi: string;
    nameLabel: string;
    namePlaceholder: string;
    submit: string;
    cancel: string;
    close: string;
  };
  kanban: {
    newPhase: string;
    createCard: string;
    searchPlaceholder: string;
    backToHome: string;
  };
  defaultPhase: {
    inbox: string;
    doing: string;
    done: string;
  };
  language: {
    label: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      home: "Home",
      portal: "Portal",
      tasks: "Tasks & Requests",
      interfaces: "Interfaces",
      learningCenter: "Learning Center",
    },
    home: {
      pipesTab: "Pipes",
      databasesTab: "Databases",
      createPipeTile: "Create pipe",
      cardsCountOne: "{n} card",
      cardsCountOther: "{n} cards",
    },
    createPipe: {
      title: "Create pipe",
      searchPlaceholder: "Search",
      templatesHeading: "AI agent templates",
      categoriesHeading: "Process categories",
      createFromScratch: "Create pipe from scratch",
      createWithAi: "Create with AI",
      nameLabel: "Pipe name",
      namePlaceholder: "e.g. Purchase Requests",
      submit: "Create pipe",
      cancel: "Cancel",
      close: "Close",
    },
    kanban: {
      newPhase: "New phase",
      createCard: "Create new card",
      searchPlaceholder: "Search cards",
      backToHome: "Back to home",
    },
    defaultPhase: { inbox: "Inbox", doing: "Doing", done: "Done" },
    language: { label: "Language" },
  },
  pt: {
    nav: {
      home: "Início",
      portal: "Portal",
      tasks: "Tarefas e Solicitações",
      interfaces: "Interfaces",
      learningCenter: "Learning Center",
    },
    home: {
      pipesTab: "Pipes",
      databasesTab: "Databases",
      createPipeTile: "Criar pipe",
      cardsCountOne: "{n} card",
      cardsCountOther: "{n} cards",
    },
    createPipe: {
      title: "Criar pipe",
      searchPlaceholder: "Pesquisar",
      templatesHeading: "Templates com agentes de IA",
      categoriesHeading: "Categorias de processos",
      createFromScratch: "Criar pipe do zero",
      createWithAi: "Criar com IA",
      nameLabel: "Nome do pipe",
      namePlaceholder: "ex. Solicitações de Compra",
      submit: "Criar pipe",
      cancel: "Cancelar",
      close: "Fechar",
    },
    kanban: {
      newPhase: "Nova fase",
      createCard: "Criar novo card",
      searchPlaceholder: "Procurar cards",
      backToHome: "Voltar ao início",
    },
    defaultPhase: {
      inbox: "Caixa de entrada",
      doing: "Fazendo",
      done: "Concluído",
    },
    language: { label: "Idioma" },
  },
  es: {
    nav: {
      home: "Inicio",
      portal: "Portal",
      tasks: "Tareas y Solicitudes",
      interfaces: "Interfaces",
      learningCenter: "Centro de aprendizaje",
    },
    home: {
      pipesTab: "Pipes",
      databasesTab: "Bases de datos",
      createPipeTile: "Crear pipe",
      cardsCountOne: "{n} tarjeta",
      cardsCountOther: "{n} tarjetas",
    },
    createPipe: {
      title: "Crear pipe",
      searchPlaceholder: "Buscar",
      templatesHeading: "Plantillas con agentes de IA",
      categoriesHeading: "Categorías de procesos",
      createFromScratch: "Crear pipe desde cero",
      createWithAi: "Crear con IA",
      nameLabel: "Nombre del pipe",
      namePlaceholder: "ej. Solicitudes de Compra",
      submit: "Crear pipe",
      cancel: "Cancelar",
      close: "Cerrar",
    },
    kanban: {
      newPhase: "Nueva fase",
      createCard: "Crear nueva tarjeta",
      searchPlaceholder: "Buscar tarjetas",
      backToHome: "Volver al inicio",
    },
    defaultPhase: {
      inbox: "Bandeja de entrada",
      doing: "En curso",
      done: "Concluido",
    },
    language: { label: "Idioma" },
  },
  zh: {
    nav: {
      home: "首页",
      portal: "门户",
      tasks: "任务与请求",
      interfaces: "界面",
      learningCenter: "学习中心",
    },
    home: {
      pipesTab: "流程",
      databasesTab: "数据库",
      createPipeTile: "创建流程",
      cardsCountOne: "{n} 张卡片",
      cardsCountOther: "{n} 张卡片",
    },
    createPipe: {
      title: "创建流程",
      searchPlaceholder: "搜索",
      templatesHeading: "AI 代理模板",
      categoriesHeading: "流程分类",
      createFromScratch: "从零创建流程",
      createWithAi: "用 AI 创建",
      nameLabel: "流程名称",
      namePlaceholder: "例如：采购申请",
      submit: "创建流程",
      cancel: "取消",
      close: "关闭",
    },
    kanban: {
      newPhase: "新阶段",
      createCard: "创建新卡片",
      searchPlaceholder: "搜索卡片",
      backToHome: "返回首页",
    },
    defaultPhase: { inbox: "收件箱", doing: "进行中", done: "已完成" },
    language: { label: "语言" },
  },
  de: {
    nav: {
      home: "Start",
      portal: "Portal",
      tasks: "Aufgaben & Anfragen",
      interfaces: "Oberflächen",
      learningCenter: "Lerncenter",
    },
    home: {
      pipesTab: "Pipes",
      databasesTab: "Datenbanken",
      createPipeTile: "Pipe erstellen",
      cardsCountOne: "{n} Karte",
      cardsCountOther: "{n} Karten",
    },
    createPipe: {
      title: "Pipe erstellen",
      searchPlaceholder: "Suchen",
      templatesHeading: "Vorlagen mit KI-Agenten",
      categoriesHeading: "Prozesskategorien",
      createFromScratch: "Pipe von Grund auf erstellen",
      createWithAi: "Mit KI erstellen",
      nameLabel: "Pipe-Name",
      namePlaceholder: "z. B. Einkaufsanfragen",
      submit: "Pipe erstellen",
      cancel: "Abbrechen",
      close: "Schließen",
    },
    kanban: {
      newPhase: "Neue Phase",
      createCard: "Neue Karte erstellen",
      searchPlaceholder: "Karten suchen",
      backToHome: "Zurück zum Start",
    },
    defaultPhase: {
      inbox: "Posteingang",
      doing: "In Bearbeitung",
      done: "Erledigt",
    },
    language: { label: "Sprache" },
  },
  fr: {
    nav: {
      home: "Accueil",
      portal: "Portail",
      tasks: "Tâches et demandes",
      interfaces: "Interfaces",
      learningCenter: "Centre d'apprentissage",
    },
    home: {
      pipesTab: "Pipes",
      databasesTab: "Bases de données",
      createPipeTile: "Créer un pipe",
      cardsCountOne: "{n} carte",
      cardsCountOther: "{n} cartes",
    },
    createPipe: {
      title: "Créer un pipe",
      searchPlaceholder: "Rechercher",
      templatesHeading: "Modèles avec agents IA",
      categoriesHeading: "Catégories de processus",
      createFromScratch: "Créer un pipe à partir de zéro",
      createWithAi: "Créer avec l'IA",
      nameLabel: "Nom du pipe",
      namePlaceholder: "ex. Demandes d'achat",
      submit: "Créer un pipe",
      cancel: "Annuler",
      close: "Fermer",
    },
    kanban: {
      newPhase: "Nouvelle phase",
      createCard: "Créer une nouvelle carte",
      searchPlaceholder: "Rechercher des cartes",
      backToHome: "Retour à l'accueil",
    },
    defaultPhase: {
      inbox: "Boîte de réception",
      doing: "En cours",
      done: "Terminé",
    },
    language: { label: "Langue" },
  },
  ja: {
    nav: {
      home: "ホーム",
      portal: "ポータル",
      tasks: "タスクとリクエスト",
      interfaces: "インターフェース",
      learningCenter: "ラーニングセンター",
    },
    home: {
      pipesTab: "パイプ",
      databasesTab: "データベース",
      createPipeTile: "パイプを作成",
      cardsCountOne: "{n} 件のカード",
      cardsCountOther: "{n} 件のカード",
    },
    createPipe: {
      title: "パイプを作成",
      searchPlaceholder: "検索",
      templatesHeading: "AIエージェントテンプレート",
      categoriesHeading: "プロセスカテゴリ",
      createFromScratch: "ゼロからパイプを作成",
      createWithAi: "AIで作成",
      nameLabel: "パイプ名",
      namePlaceholder: "例：購買リクエスト",
      submit: "パイプを作成",
      cancel: "キャンセル",
      close: "閉じる",
    },
    kanban: {
      newPhase: "新しいフェーズ",
      createCard: "新しいカードを作成",
      searchPlaceholder: "カードを検索",
      backToHome: "ホームに戻る",
    },
    defaultPhase: { inbox: "受信箱", doing: "進行中", done: "完了" },
    language: { label: "言語" },
  },
  hi: {
    nav: {
      home: "होम",
      portal: "पोर्टल",
      tasks: "कार्य और अनुरोध",
      interfaces: "इंटरफ़ेस",
      learningCenter: "लर्निंग सेंटर",
    },
    home: {
      pipesTab: "पाइप्स",
      databasesTab: "डेटाबेस",
      createPipeTile: "पाइप बनाएं",
      cardsCountOne: "{n} कार्ड",
      cardsCountOther: "{n} कार्ड",
    },
    createPipe: {
      title: "पाइप बनाएं",
      searchPlaceholder: "खोजें",
      templatesHeading: "AI एजेंट टेम्पलेट",
      categoriesHeading: "प्रक्रिया श्रेणियाँ",
      createFromScratch: "शुरू से पाइप बनाएं",
      createWithAi: "AI से बनाएं",
      nameLabel: "पाइप का नाम",
      namePlaceholder: "जैसे, खरीद अनुरोध",
      submit: "पाइप बनाएं",
      cancel: "रद्द करें",
      close: "बंद करें",
    },
    kanban: {
      newPhase: "नया चरण",
      createCard: "नया कार्ड बनाएं",
      searchPlaceholder: "कार्ड खोजें",
      backToHome: "होम पर वापस जाएं",
    },
    defaultPhase: { inbox: "इनबॉक्स", doing: "प्रगति पर", done: "पूर्ण" },
    language: { label: "भाषा" },
  },
  ar: {
    nav: {
      home: "الرئيسية",
      portal: "البوابة",
      tasks: "المهام والطلبات",
      interfaces: "الواجهات",
      learningCenter: "مركز التعلم",
    },
    home: {
      pipesTab: "الأنابيب",
      databasesTab: "قواعد البيانات",
      createPipeTile: "إنشاء أنبوب",
      cardsCountOne: "{n} بطاقة",
      cardsCountOther: "{n} بطاقة",
    },
    createPipe: {
      title: "إنشاء أنبوب",
      searchPlaceholder: "بحث",
      templatesHeading: "قوالب بوكلاء الذكاء الاصطناعي",
      categoriesHeading: "فئات العمليات",
      createFromScratch: "إنشاء أنبوب من الصفر",
      createWithAi: "الإنشاء بالذكاء الاصطناعي",
      nameLabel: "اسم الأنبوب",
      namePlaceholder: "مثال: طلبات الشراء",
      submit: "إنشاء أنبوب",
      cancel: "إلغاء",
      close: "إغلاق",
    },
    kanban: {
      newPhase: "مرحلة جديدة",
      createCard: "إنشاء بطاقة جديدة",
      searchPlaceholder: "البحث عن البطاقات",
      backToHome: "العودة إلى الرئيسية",
    },
    defaultPhase: { inbox: "صندوق الوارد", doing: "قيد التنفيذ", done: "منجز" },
    language: { label: "اللغة" },
  },
  ru: {
    nav: {
      home: "Главная",
      portal: "Портал",
      tasks: "Задачи и запросы",
      interfaces: "Интерфейсы",
      learningCenter: "Учебный центр",
    },
    home: {
      pipesTab: "Пайпы",
      databasesTab: "Базы данных",
      createPipeTile: "Создать пайп",
      cardsCountOne: "{n} карточка",
      cardsCountOther: "{n} карточек",
    },
    createPipe: {
      title: "Создать пайп",
      searchPlaceholder: "Поиск",
      templatesHeading: "Шаблоны с ИИ-агентами",
      categoriesHeading: "Категории процессов",
      createFromScratch: "Создать пайп с нуля",
      createWithAi: "Создать с помощью ИИ",
      nameLabel: "Название пайпа",
      namePlaceholder: "например, Заявки на закупку",
      submit: "Создать пайп",
      cancel: "Отмена",
      close: "Закрыть",
    },
    kanban: {
      newPhase: "Новый этап",
      createCard: "Создать карточку",
      searchPlaceholder: "Поиск карточек",
      backToHome: "На главную",
    },
    defaultPhase: { inbox: "Входящие", doing: "В работе", done: "Готово" },
    language: { label: "Язык" },
  },
};
