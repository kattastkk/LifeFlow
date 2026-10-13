export const JOURNAL_TOPICS = [
  { key: "grateful", icon: "🙏", label: "3 things I am grateful for today" },
  { key: "felt_most", icon: "💗", label: "What I felt the most today" },
  { key: "achievements", icon: "🏆", label: "Achievements I am proud of" },
  { key: "learned", icon: "💡", label: "New things I learned today" },
  { key: "worries", icon: "🌧️", label: "Current worries or anxieties" },
  { key: "tomorrow", icon: "📝", label: "Things to do tomorrow" },
] as const;

export type JournalTopicKey = (typeof JOURNAL_TOPICS)[number]["key"];
