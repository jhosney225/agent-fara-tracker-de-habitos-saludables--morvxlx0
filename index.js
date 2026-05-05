
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as readline from "readline";

const client = new Anthropic();

// Data storage
const DATA_FILE = "habits_data.json";

interface Habit {
  id: string;
  name: string;
  category: string;
  frequency: string;
  createdDate: string;
  entries: HabitEntry[];
}

interface HabitEntry {
  date: string;
  completed: boolean;
}

interface HabitsDatabase {
  habits: Habit[];
}

// Load or initialize habits database
function loadData(): HabitsDatabase {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  }
  return { habits: [] };
}

// Save habits database
function saveData(data: HabitsDatabase): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Calculate statistics for a habit
function calculateStats(habit: Habit): {
  totalDays: number;
  completedDays: number;
  streak: number;
  percentage: number;
} {
  const entries = habit.entries;
  const totalDays = entries.length;
  const completedDays = entries.filter((e) => e.completed).length;
  const percentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  // Calculate current streak
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].completed) {
      streak++;
    } else {
      break;
    }
  }

  return {
    totalDays,
    completedDays,
    streak,
    percentage: Math.round(percentage),
  };
}

// Create a new habit
function createHabit(
  name: string,
  category: string,
  frequency: string
): Habit {
  return {
    id: Date.now().toString(),
    name,
    category,
    frequency,
    createdDate: new Date().toISOString().split("T")[0],
    entries: [],
  };
}

// Format habit statistics for display
function formatHabitStats(habit: Habit): string {
  const stats = calculateStats(habit);
  return `
Hábito: ${habit.name}
Categoría: ${habit.category}
Frecuencia: ${habit.frequency}
Fecha de creación: ${habit.createdDate}
─────────────────
Estadísticas:
  • Días registrados: ${stats.totalDays}
  • Días completados: ${stats.completedDays}
  • Racha actual: ${stats.streak} días
  • Porcentaje de cumplimiento: ${stats.percentage}%`;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main conversation loop with Claude
async function main(): Promise<void> {
  const conversationHistory: { role: string; content: string }[] = [];
  let data = loadData();

  console.log("🏃 TRACKER DE HÁBITOS SALUDABLES CON IA");
  console.log("======================================");
  console.log(
    "Bienvenido al sistema de seguimiento de hábitos saludables."
  );
  console.log(
    "Puedes añadir hábitos, registrar tu progreso y obtener estadísticas."
  );
  console.log('Escribe "salir" para terminar.\n');

  // Initialize conversation with Claude
  const systemPrompt = `Eres un asistente experto en salud y hábitos saludables. 
Ayudas a los usuarios a crear, mantener y analizar sus hábitos saludables.
El usuario puede pedir:
1. Crear nuevos hábitos (nombre, categoría como "ejercicio", "alimentación", "sueño", "meditación", etc., y frecuencia)
2. Registrar el cumplimiento de hábitos (marcar como hecho)
3. Ver estadísticas de sus hábitos
4. Obtener motivación y consejos

Cuando el usuario quiera crear un hábito, extrae: nombre del hábito, categoría y frecuencia.
Cuando quiera registrar un hábito, identifica cuál.
Sé motivador, amable y proporciona consejos de salud cuando sea apropiado.
Responde de forma concisa pero útil.`;

  while (true) {
    const userInput = await prompt("\n👤 Tú: ");

    if (userInput.toLowerCase() === "salir") {
      console.log(
        "¡Gracias por usar el Tracker de Hábitos! ¡Sigue adelante con tus metas! 💪"
      );
      rl.close();
      break;
    }

    // Add user message to conversation history
    conversationHistory.push({
      role: "user",
      content: userInput,
    });

    try {
      // Call Claude API
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg