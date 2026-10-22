import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.*;
import com.sun.net.httpserver.*;

/**
 * ============================================================================
 * 💰 PERSONAL EXPENSE TRACKER — STANDALONE JAVA IMPLEMENTATION
 * ============================================================================
 * Features:
 *  1. Simple Profile (Full Name, Email Address, validated, no extra clutter)
 *  2. Quick-Add Expense (Amount, Description, auto date/time, auto category)
 *  3. Initial Zero State (Starts at 0 expenses; calculations begin on addition)
 *  4. Dynamic Weekly Budget (Not stuck at ₹2,000; threshold alerts at 50, 75, 90, 100%)
 *  5. Formspree Email Delivery (https://formspree.io/f/moejgbov)
 *  6. Strict Form & Email Message Format:
 *       date         amount      spent on                 category
 *       ----------------------------------------------------------------------
 *       [expenses]
 *
 *       total spent: [amount]
 *       balance: [remaining]
 *       (Nothing extra)
 *  7. Automated Sunday 12:00 AM Scheduler with duplicate prevention
 *  8. Local JSON File Persistence
 *  9. Embedded REST API Server (port 5000) + Interactive Terminal CLI
 *
 * Execution:
 *   java ExpenseTrackerApp.java
 *   (or compile with: javac ExpenseTrackerApp.java && java ExpenseTrackerApp)
 * ============================================================================
 */
public class ExpenseTrackerApp {

    private static final String FORMSPREE_URL = "https://formspree.io/f/moejgbov";
    private static final Path DATA_FILE = Paths.get("server", "data", "store.json");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    // ==========================================
    // 1. DATA MODELS
    // ==========================================

    public static class Profile {
        public String fullName = "";
        public String email = "";
        public String updatedAt = Instant.now().toString();

        public Profile() {}
        public Profile(String fullName, String email) {
            this.fullName = fullName;
            this.email = email;
            this.updatedAt = Instant.now().toString();
        }

        public boolean isValid() {
            return fullName != null && !fullName.trim().isEmpty() &&
                   email != null && email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$");
        }
    }

    public static class Expense {
        public String id;
        public double amount;
        public String description;
        public String category;
        public String date;
        public String time;
        public String createdAt;

        public Expense() {
            this.id = UUID.randomUUID().toString();
            this.createdAt = Instant.now().toString();
        }

        public Expense(double amount, String description, String category, String date, String time) {
            this.id = UUID.randomUUID().toString();
            this.amount = amount;
            this.description = description;
            this.category = category;
            this.date = date;
            this.time = time;
            this.createdAt = Instant.now().toString();
        }
    }

    public static class BudgetSettings {
        public Double weeklyBudget = 2000.0;
        public Double monthlyBudget = 15000.0;
        public String updatedAt = Instant.now().toString();
    }

    public static class ReportSettings {
        public boolean isActive = true;
        public String deliveryDay = "Sunday";
        public String deliveryTime = "00:00";
        public String timezone = "Asia/Kolkata";
        public String lastSentPeriod = null;
    }

    public static class DatabaseStore {
        public Profile profile = new Profile();
        public List<Expense> expenses = new ArrayList<>();
        public BudgetSettings budgets = new BudgetSettings();
        public ReportSettings reportSettings = new ReportSettings();
    }

    // ==========================================
    // 2. REAL-TIME CATEGORY AUTO-DETECTION
    // ==========================================

    public static class CategoryClassifier {
        private static final Map<String, List<String>> KEYWORDS = new LinkedHashMap<>();

        static {
            KEYWORDS.put("Food & Drinks", Arrays.asList(
                "tea", "coffee", "chai", "snack", "snacks", "lunch", "dinner", "breakfast",
                "pizza", "burger", "food", "restaurant", "cafe", "swiggy", "zomato", "biryani",
                "bread", "milk", "egg", "fruits", "vegetables", "juice", "biscuit", "bakery"
            ));
            KEYWORDS.put("Transportation", Arrays.asList(
                "uber", "ola", "rapido", "auto", "cab", "taxi", "metro", "bus", "train",
                "fuel", "petrol", "diesel", "toll", "flight", "ticket", "parking", "railway"
            ));
            KEYWORDS.put("Shopping", Arrays.asList(
                "amazon", "flipkart", "myntra", "clothes", "shoes", "shirt", "pants",
                "grocery", "groceries", "supermarket", "mall", "electronics", "books"
            ));
            KEYWORDS.put("Bills & Utilities", Arrays.asList(
                "electricity", "water", "gas", "wifi", "internet", "broadband", "mobile",
                "recharge", "phone bill", "current bill", "maintenance", "rent"
            ));
            KEYWORDS.put("Entertainment", Arrays.asList(
                "netflix", "amazon prime", "spotify", "hotstar", "movie", "cinema", "theatre",
                "games", "gaming", "steam", "playstation", "outing", "concert"
            ));
            KEYWORDS.put("Health & Wellness", Arrays.asList(
                "doctor", "hospital", "clinic", "medicine", "pharmacy", "medical", "tablets",
                "gym", "fitness", "yoga", "dental", "checkup"
            ));
        }

        public static String detect(String description) {
            if (description == null || description.trim().isEmpty()) {
                return "Other";
            }
            String lower = description.toLowerCase();
            for (Map.Entry<String, List<String>> entry : KEYWORDS.entrySet()) {
                for (String kw : entry.getValue()) {
                    if (lower.contains(kw)) {
                        return entry.getKey();
                    }
                }
            }
            return "Other";
        }
    }

    // ==========================================
    // 3. PERSISTENCE ENGINE (JSON FILE DB)
    // ==========================================

    public static class StorageService {
        private final Path path;
        private DatabaseStore store = new DatabaseStore();

        public StorageService(Path path) {
            this.path = path;
            load();
        }

        public synchronized DatabaseStore getStore() {
            return store;
        }

        public synchronized void load() {
            try {
                if (!Files.exists(path)) {
                    Files.createDirectories(path.getParent());
                    save();
                    return;
                }
                String content = Files.readString(path, StandardCharsets.UTF_8);
                parseJson(content);
            } catch (Exception e) {
                System.err.println("Notice: Initializing fresh database store (" + e.getMessage() + ")");
                store = new DatabaseStore();
                save();
            }
        }

        public synchronized void save() {
            try {
                if (!Files.exists(path.getParent())) {
                    Files.createDirectories(path.getParent());
                }
                StringBuilder sb = new StringBuilder();
                sb.append("{\n");
                // Profile
                sb.append("  \"profile\": {\n");
                sb.append("    \"full_name\": \"").append(escape(store.profile.fullName)).append("\",\n");
                sb.append("    \"email\": \"").append(escape(store.profile.email)).append("\",\n");
                sb.append("    \"updated_at\": \"").append(escape(store.profile.updatedAt)).append("\"\n");
                sb.append("  },\n");
                // Expenses
                sb.append("  \"expenses\": [\n");
                for (int i = 0; i < store.expenses.size(); i++) {
                    Expense e = store.expenses.get(i);
                    sb.append("    {\n");
                    sb.append("      \"id\": \"").append(e.id).append("\",\n");
                    sb.append("      \"amount\": ").append(e.amount).append(",\n");
                    sb.append("      \"description\": \"").append(escape(e.description)).append("\",\n");
                    sb.append("      \"category\": \"").append(escape(e.category)).append("\",\n");
                    sb.append("      \"date\": \"").append(e.date).append("\",\n");
                    sb.append("      \"time\": \"").append(e.time).append("\",\n");
                    sb.append("      \"created_at\": \"").append(e.createdAt).append("\"\n");
                    sb.append("    }").append(i < store.expenses.size() - 1 ? "," : "").append("\n");
                }
                sb.append("  ],\n");
                // Budgets
                sb.append("  \"budgets\": {\n");
                sb.append("    \"weekly_budget\": ").append(store.budgets.weeklyBudget).append(",\n");
                sb.append("    \"monthly_budget\": ").append(store.budgets.monthlyBudget).append(",\n");
                sb.append("    \"updated_at\": \"").append(escape(store.budgets.updatedAt)).append("\"\n");
                sb.append("  },\n");
                // Report Settings
                sb.append("  \"report_settings\": {\n");
                sb.append("    \"is_active\": ").append(store.reportSettings.isActive).append(",\n");
                sb.append("    \"delivery_day\": \"").append(escape(store.reportSettings.deliveryDay)).append("\",\n");
                sb.append("    \"delivery_time\": \"").append(escape(store.reportSettings.deliveryTime)).append("\",\n");
                sb.append("    \"timezone\": \"").append(escape(store.reportSettings.timezone)).append("\",\n");
                sb.append("    \"last_sent_period\": ").append(store.reportSettings.lastSentPeriod == null ? "null" : "\"" + escape(store.reportSettings.lastSentPeriod) + "\"").append("\n");
                sb.append("  }\n");
                sb.append("}\n");
                Files.writeString(path, sb.toString(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                System.err.println("Error saving database: " + e.getMessage());
            }
        }

        private void parseJson(String json) {
            // Simple robust regex parser for our structured database
            store = new DatabaseStore();

            // Profile
            Matcher mName = Pattern.compile("\"full_name\"\\s*:\\s*\"([^\"]*)\"").matcher(json);
            if (mName.find()) store.profile.fullName = mName.group(1);
            Matcher mEmail = Pattern.compile("\"email\"\\s*:\\s*\"([^\"]*)\"").matcher(json);
            if (mEmail.find()) store.profile.email = mEmail.group(1);

            // Weekly Budget
            Matcher mWB = Pattern.compile("\"weekly_budget\"\\s*:\\s*([0-9.]+)").matcher(json);
            if (mWB.find()) store.budgets.weeklyBudget = Double.parseDouble(mWB.group(1));

            // Monthly Budget
            Matcher mMB = Pattern.compile("\"monthly_budget\"\\s*:\\s*([0-9.]+)").matcher(json);
            if (mMB.find()) store.budgets.monthlyBudget = Double.parseDouble(mMB.group(1));

            // Expenses array
            int expStart = json.indexOf("\"expenses\":");
            if (expStart != -1) {
                int arrayStart = json.indexOf("[", expStart);
                int arrayEnd = json.indexOf("]", arrayStart);
                if (arrayStart != -1 && arrayEnd != -1) {
                    String arrBody = json.substring(arrayStart + 1, arrayEnd);
                    Matcher objMatcher = Pattern.compile("\\{([^}]+)\\}").matcher(arrBody);
                    while (objMatcher.find()) {
                        String objContent = objMatcher.group(1);
                        Expense e = new Expense();
                        Matcher mAmt = Pattern.compile("\"amount\"\\s*:\\s*([0-9.]+)").matcher(objContent);
                        if (mAmt.find()) e.amount = Double.parseDouble(mAmt.group(1));
                        Matcher mDesc = Pattern.compile("\"description\"\\s*:\\s*\"([^\"]*)\"").matcher(objContent);
                        if (mDesc.find()) e.description = mDesc.group(1);
                        Matcher mCat = Pattern.compile("\"category\"\\s*:\\s*\"([^\"]*)\"").matcher(objContent);
                        if (mCat.find()) e.category = mCat.group(1);
                        Matcher mDate = Pattern.compile("\"date\"\\s*:\\s*\"([^\"]*)\"").matcher(objContent);
                        if (mDate.find()) e.date = mDate.group(1);
                        Matcher mTime = Pattern.compile("\"time\"\\s*:\\s*\"([^\"]*)\"").matcher(objContent);
                        if (mTime.find()) e.time = mTime.group(1);
                        store.expenses.add(e);
                    }
                }
            }

            // Report settings last sent
            Matcher mLast = Pattern.compile("\"last_sent_period\"\\s*:\\s*\"([^\"]*)\"").matcher(json);
            if (mLast.find()) store.reportSettings.lastSentPeriod = mLast.group(1);
        }

        private String escape(String s) {
            if (s == null) return "";
            return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
        }
    }

    // ==========================================
    // 4. FORMSPREE DELIVERY & EMAIL FORMATTER
    // ==========================================

    public static class FormspreeService {
        private final HttpClient httpClient;

        public FormspreeService() {
            this.httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .build();
        }

        public static String formatINR(double amount) {
            return String.format("₹%,.0f", amount);
        }

        /**
         * Builds the STRICT minimal email & Formspree plain text format:
         *
         * date         amount      spent on                 category
         * ----------------------------------------------------------------------
         * [rows]
         *
         * total spent: [amount]
         * balance: [remaining]
         *
         * (after this total spent , balance only this should come nothing extra)
         */
        public static String generateMessage(List<Expense> expenses, double totalSpent, double balance) {
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("%-12s %-11s %-24s %s\n", "date", "amount", "spent on", "category"));
            sb.append("----------------------------------------------------------------------\n");

            if (expenses == null || expenses.isEmpty()) {
                sb.append("No expenses recorded\n");
            } else {
                for (Expense e : expenses) {
                    sb.append(String.format("%-12s %-11s %-24s %s\n",
                            e.date != null ? e.date : "",
                            formatINR(e.amount),
                            e.description != null ? e.description : "",
                            e.category != null ? e.category : "Other"));
                }
            }

            sb.append("\n");
            sb.append("total spent: ").append(formatINR(totalSpent)).append("\n");
            sb.append("balance: ").append(formatINR(balance));
            return sb.toString();
        }

        public boolean sendReport(Profile profile, List<Expense> weeklyExpenses, double weeklyBudget, String targetEmail) {
            String recipient = (targetEmail != null && !targetEmail.trim().isEmpty()) ? targetEmail : profile.email;
            if (recipient == null || recipient.trim().isEmpty()) {
                System.err.println("❌ No recipient email specified.");
                return false;
            }

            double totalSpent = 0.0;
            for (Expense e : weeklyExpenses) totalSpent += e.amount;
            double balance = Math.max(0.0, weeklyBudget - totalSpent);

            String messageText = generateMessage(weeklyExpenses, totalSpent, balance);

            // Table rows string for Formspree table attribute
            StringBuilder tableRows = new StringBuilder();
            if (weeklyExpenses.isEmpty()) {
                tableRows.append("No expenses recorded");
            } else {
                for (Expense e : weeklyExpenses) {
                    tableRows.append(String.format("%-12s %-11s %-24s %s\n",
                            e.date, formatINR(e.amount), e.description, e.category));
                }
            }

            // Construct JSON payload for https://formspree.io/f/moejgbov
            String payload = "{\n" +
                    "  \"email\": \"" + escapeJson(recipient) + "\",\n" +
                    "  \"_replyto\": \"" + escapeJson(recipient) + "\",\n" +
                    "  \"_subject\": \"Weekly Expense Report\",\n" +
                    "  \"date_amount_spent_on_category\": \"" + escapeJson(tableRows.toString()) + "\",\n" +
                    "  \"total_spent\": \"" + formatINR(totalSpent) + "\",\n" +
                    "  \"balance\": \"" + formatINR(balance) + "\",\n" +
                    "  \"message\": \"" + escapeJson(messageText) + "\"\n" +
                    "}";

            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(FORMSPREE_URL))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    System.out.println("✅ Weekly report successfully dispatched to " + recipient + " via Formspree!");
                    return true;
                } else {
                    System.err.println("❌ Formspree HTTP Error " + response.statusCode() + ": " + response.body());
                    return false;
                }
            } catch (Exception e) {
                System.err.println("❌ Failed to send via Formspree: " + e.getMessage());
                return false;
            }
        }

        private static String escapeJson(String s) {
            if (s == null) return "";
            return s.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "");
        }
    }

    // ==========================================
    // 5. AUTOMATED SUNDAY 12:00 AM SCHEDULER
    // ==========================================

    public static class WeeklyScheduler {
        private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        private final StorageService storageService;
        private final FormspreeService formspreeService;

        public WeeklyScheduler(StorageService storageService, FormspreeService formspreeService) {
            this.storageService = storageService;
            this.formspreeService = formspreeService;
        }

        public void start() {
            // Heartbeat execution every minute to check if it's Sunday 12:00 AM (00:00 midnight)
            scheduler.scheduleAtFixedRate(this::checkAndDispatch, 10, 60, TimeUnit.SECONDS);
            System.out.println("⏰ Sunday 12:00 AM Weekly Report Scheduler is ACTIVE.");
        }

        private void checkAndDispatch() {
            DatabaseStore store = storageService.getStore();
            if (!store.reportSettings.isActive || store.profile.email.isEmpty()) return;

            ZoneId zoneId;
            try {
                zoneId = ZoneId.of(store.reportSettings.timezone != null ? store.reportSettings.timezone : "Asia/Kolkata");
            } catch (Exception e) {
                zoneId = ZoneId.of("Asia/Kolkata");
            }

            ZonedDateTime now = ZonedDateTime.now(zoneId);
            DayOfWeek day = now.getDayOfWeek();
            int hour = now.getHour();
            int minute = now.getMinute();

            // Check if today is Sunday and time is 00:00 (12:00 AM midnight)
            if (day == DayOfWeek.SUNDAY && hour == 0 && minute == 0) {
                String periodKey = now.toLocalDate().minusDays(7).format(DATE_FMT) + "_to_" + now.toLocalDate().format(DATE_FMT);
                if (periodKey.equals(store.reportSettings.lastSentPeriod)) {
                    // Prevent duplicate dispatch
                    return;
                }

                System.out.println("🚀 Scheduled Sunday 12:00 AM trigger running for period: " + periodKey);
                List<Expense> pastWeekExpenses = getPastWeekExpenses(store.expenses, now.toLocalDate());
                boolean ok = formspreeService.sendReport(store.profile, pastWeekExpenses, store.budgets.weeklyBudget, store.profile.email);
                if (ok) {
                    store.reportSettings.lastSentPeriod = periodKey;
                    storageService.save();
                }
            }
        }

        public List<Expense> getPastWeekExpenses(List<Expense> allExpenses, LocalDate endDate) {
            LocalDate startDate = endDate.minusDays(7);
            List<Expense> filtered = new ArrayList<>();
            for (Expense e : allExpenses) {
                if (e.date == null) continue;
                try {
                    LocalDate d = LocalDate.parse(e.date, DATE_FMT);
                    if (!d.isBefore(startDate) && !d.isAfter(endDate)) {
                        filtered.add(e);
                    }
                } catch (Exception ignored) {}
            }
            return filtered;
        }
    }

    // ==========================================
    // 6. EMBEDDED REST API SERVER (PORT 5000)
    // ==========================================

    public static class RestApiServer {
        private final HttpServer server;
        private final StorageService storage;
        private final FormspreeService formspree;

        public RestApiServer(int port, StorageService storage, FormspreeService formspree) throws IOException {
            this.storage = storage;
            this.formspree = formspree;
            this.server = HttpServer.create(new InetSocketAddress(port), 0);

            // API Endpoints
            server.createContext("/api/status", this::handleStatus);
            server.createContext("/api/profile", this::handleProfile);
            server.createContext("/api/expenses", this::handleExpenses);
            server.createContext("/api/budgets", this::handleBudgets);
            server.createContext("/api/reports/send-weekly", this::handleSendWeekly);

            server.setExecutor(Executors.newCachedThreadPool());
        }

        public void start() {
            server.start();
            System.out.println("🌐 REST API Server running on port " + server.getAddress().getPort());
        }

        private void handleStatus(HttpExchange exchange) throws IOException {
            DatabaseStore s = storage.getStore();
            String json = "{\n" +
                    "  \"status\": \"online\",\n" +
                    "  \"formspree_configured\": true,\n" +
                    "  \"formspree_url\": \"" + FORMSPREE_URL + "\",\n" +
                    "  \"expenses_count\": " + s.expenses.size() + ",\n" +
                    "  \"weekly_budget\": " + s.budgets.weeklyBudget + "\n" +
                    "}";
            sendResponse(exchange, 200, json);
        }

        private void handleProfile(HttpExchange exchange) throws IOException {
            DatabaseStore s = storage.getStore();
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                String json = "{\"full_name\":\"" + s.profile.fullName + "\",\"email\":\"" + s.profile.email + "\"}";
                sendResponse(exchange, 200, json);
            } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                Matcher mName = Pattern.compile("\"full_name\"\\s*:\\s*\"([^\"]*)\"").matcher(body);
                Matcher mEmail = Pattern.compile("\"email\"\\s*:\\s*\"([^\"]*)\"").matcher(body);
                if (mName.find() && mEmail.find()) {
                    s.profile.fullName = mName.group(1);
                    s.profile.email = mEmail.group(1);
                    s.profile.updatedAt = Instant.now().toString();
                    storage.save();
                    sendResponse(exchange, 200, "{\"success\":true}");
                } else {
                    sendResponse(exchange, 400, "{\"error\":\"Invalid profile payload\"}");
                }
            }
        }

        private void handleExpenses(HttpExchange exchange) throws IOException {
            DatabaseStore s = storage.getStore();
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < s.expenses.size(); i++) {
                    Expense e = s.expenses.get(i);
                    sb.append("{\"id\":\"").append(e.id)
                      .append("\",\"amount\":").append(e.amount)
                      .append(",\"description\":\"").append(e.description)
                      .append("\",\"category\":\"").append(e.category)
                      .append("\",\"date\":\"").append(e.date)
                      .append("\",\"time\":\"").append(e.time).append("\"}")
                      .append(i < s.expenses.size() - 1 ? "," : "");
                }
                sb.append("]");
                sendResponse(exchange, 200, sb.toString());
            } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                Matcher mAmt = Pattern.compile("\"amount\"\\s*:\\s*([0-9.]+)").matcher(body);
                Matcher mDesc = Pattern.compile("\"description\"\\s*:\\s*\"([^\"]*)\"").matcher(body);
                if (mAmt.find() && mDesc.find()) {
                    double amt = Double.parseDouble(mAmt.group(1));
                    String desc = mDesc.group(1);
                    String category = CategoryClassifier.detect(desc);
                    String date = LocalDate.now().format(DATE_FMT);
                    String time = LocalTime.now().format(TIME_FMT);

                    Expense exp = new Expense(amt, desc, category, date, time);
                    s.expenses.add(exp);
                    storage.save();
                    sendResponse(exchange, 201, "{\"success\":true,\"id\":\"" + exp.id + "\",\"category\":\"" + category + "\"}");
                } else {
                    sendResponse(exchange, 400, "{\"error\":\"Requires amount and description\"}");
                }
            }
        }

        private void handleBudgets(HttpExchange exchange) throws IOException {
            DatabaseStore s = storage.getStore();
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 200, "{\"weekly_budget\":" + s.budgets.weeklyBudget + ",\"monthly_budget\":" + s.budgets.monthlyBudget + "}");
            } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                Matcher mWB = Pattern.compile("\"weekly_budget\"\\s*:\\s*([0-9.]+)").matcher(body);
                if (mWB.find()) {
                    s.budgets.weeklyBudget = Double.parseDouble(mWB.group(1));
                    storage.save();
                    sendResponse(exchange, 200, "{\"success\":true,\"weekly_budget\":" + s.budgets.weeklyBudget + "}");
                } else {
                    sendResponse(exchange, 400, "{\"error\":\"Invalid budget format\"}");
                }
            }
        }

        private void handleSendWeekly(HttpExchange exchange) throws IOException {
            DatabaseStore s = storage.getStore();
            List<Expense> expenses = s.expenses;
            boolean ok = formspree.sendReport(s.profile, expenses, s.budgets.weeklyBudget, s.profile.email);
            if (ok) {
                sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Report dispatched via Formspree\"}");
            } else {
                sendResponse(exchange, 500, "{\"error\":\"Failed to dispatch report\"}");
            }
        }

        private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(statusCode, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    // ==========================================
    // 7. INTERACTIVE CLI & ENTRY POINT
    // ==========================================

    public static void main(String[] args) {
        System.out.println("==================================================================");
        System.out.println("💰 PERSONAL EXPENSE TRACKER (JAVA EDITION)");
        System.out.println("==================================================================");

        StorageService storage = new StorageService(DATA_FILE);
        FormspreeService formspree = new FormspreeService();
        WeeklyScheduler scheduler = new WeeklyScheduler(storage, formspree);
        scheduler.start();

        try {
            RestApiServer restServer = new RestApiServer(5000, storage, formspree);
            restServer.start();
        } catch (Exception e) {
            System.out.println("ℹ️ REST API Server skipped or port in use: " + e.getMessage());
        }

        Scanner scanner = new Scanner(System.in);
        DatabaseStore store = storage.getStore();

        // 1. Initial Setup check
        if (!store.profile.isValid()) {
            System.out.println("\n👋 Welcome! Let's complete your simple profile setup (2 fields only):");
            System.out.print("Enter Full Name: ");
            String name = scanner.nextLine().trim();
            System.out.print("Enter Email Address: ");
            String email = scanner.nextLine().trim();

            store.profile.fullName = name.isEmpty() ? "User" : name;
            store.profile.email = email.isEmpty() ? "user@example.com" : email;
            store.profile.updatedAt = Instant.now().toString();
            storage.save();
            System.out.println("✅ Profile saved! You won't be prompted again on restart.\n");
        } else {
            System.out.println("👋 Welcome back, " + store.profile.fullName + " (" + store.profile.email + ")!\n");
        }

        while (true) {
            double totalSpent = 0.0;
            for (Expense e : store.expenses) totalSpent += e.amount;
            double remaining = Math.max(0.0, store.budgets.weeklyBudget - totalSpent);
            double utilization = store.budgets.weeklyBudget > 0 ? (totalSpent / store.budgets.weeklyBudget) * 100 : 0.0;

            System.out.println("------------------------------------------------------------------");
            System.out.println("📊 SUMMARY | Total Expenses: " + FormspreeService.formatINR(totalSpent) +
                               " | Weekly Budget: " + FormspreeService.formatINR(store.budgets.weeklyBudget) +
                               " | Balance: " + FormspreeService.formatINR(remaining) +
                               String.format(" (%.1f%%)", utilization));

            // Budget Warnings
            if (utilization >= 100.0) {
                System.out.println("🚨 ALERT: You have EXCEEDED your weekly budget!");
            } else if (utilization >= 90.0) {
                System.out.println("🔴 CAUTION: You have used 90%+ of your weekly budget!");
            } else if (utilization >= 75.0) {
                System.out.println("🟠 WARNING: You have reached 75% of your weekly budget.");
            } else if (utilization >= 50.0) {
                System.out.println("🟡 NOTICE: You have reached 50% of your weekly budget.");
            }
            System.out.println("------------------------------------------------------------------");

            System.out.println("1. Quick-Add Expense (Amount & Description)");
            System.out.println("2. View Expense Table & Form Message Preview");
            System.out.println("3. Change Weekly Budget (Currently: " + FormspreeService.formatINR(store.budgets.weeklyBudget) + ")");
            System.out.println("4. Update Profile (Name & Email)");
            System.out.println("5. Dispatch Weekly Report Now (via Formspree)");
            System.out.println("6. Reset Database (Start from ₹0 expenses)");
            System.out.println("0. Exit");
            System.out.print("Select an option (0-6): ");

            String input = scanner.nextLine().trim();
            switch (input) {
                case "1":
                    try {
                        System.out.print("Enter Amount (₹): ");
                        double amt = Double.parseDouble(scanner.nextLine().trim());
                        System.out.print("What did you spend it on? ");
                        String desc = scanner.nextLine().trim();

                        String autoCat = CategoryClassifier.detect(desc);
                        String date = LocalDate.now().format(DATE_FMT);
                        String time = LocalTime.now().format(TIME_FMT);

                        Expense exp = new Expense(amt, desc, autoCat, date, time);
                        store.expenses.add(exp);
                        storage.save();

                        System.out.println("✅ Expense added: " + FormspreeService.formatINR(amt) +
                                           " on '" + desc + "' [Auto-Category: " + autoCat +
                                           "] at " + date + " " + time);
                    } catch (NumberFormatException nfe) {
                        System.out.println("❌ Invalid amount format. Please enter a valid number.");
                    }
                    break;

                case "2":
                    System.out.println("\n📨 FORM & EMAIL MESSAGE FORMAT (STRICT MINIMAL OUTPUT):");
                    System.out.println("==================================================================");
                    System.out.println(FormspreeService.generateMessage(store.expenses, totalSpent, remaining));
                    System.out.println("==================================================================\n");
                    break;

                case "3":
                    System.out.print("Enter new Weekly Budget (₹): ");
                    try {
                        double newB = Double.parseDouble(scanner.nextLine().trim());
                        store.budgets.weeklyBudget = newB;
                        storage.save();
                        System.out.println("✅ Weekly budget updated to " + FormspreeService.formatINR(newB));
                    } catch (NumberFormatException nfe) {
                        System.out.println("❌ Invalid number entered.");
                    }
                    break;

                case "4":
                    System.out.print("Enter new Full Name: ");
                    String nn = scanner.nextLine().trim();
                    System.out.print("Enter new Email Address: ");
                    String ne = scanner.nextLine().trim();
                    if (!nn.isEmpty()) store.profile.fullName = nn;
                    if (!ne.isEmpty()) store.profile.email = ne;
                    store.profile.updatedAt = Instant.now().toString();
                    storage.save();
                    System.out.println("✅ Profile updated to: " + store.profile.fullName + " (" + store.profile.email + ")");
                    break;

                case "5":
                    System.out.println("📤 Dispatching report to " + store.profile.email + " via Formspree...");
                    boolean ok = formspree.sendReport(store.profile, store.expenses, store.budgets.weeklyBudget, store.profile.email);
                    if (ok) {
                        System.out.println("🎉 Email dispatched and form record saved to Formspree!");
                    } else {
                        System.out.println("❌ Delivery failed. Please verify internet connection.");
                    }
                    break;

                case "6":
                    System.out.print("Are you sure you want to clear all expenses to ₹0? (y/n): ");
                    if ("y".equalsIgnoreCase(scanner.nextLine().trim())) {
                        store.expenses.clear();
                        storage.save();
                        System.out.println("🧹 Expenses reset to 0 records (₹0 total spent).");
                    }
                    break;

                case "0":
                    System.out.println("👋 Goodbye! Server and scheduler stopped.");
                    System.exit(0);
                    break;

                default:
                    System.out.println("Invalid selection. Please choose 0 to 6.");
            }
        }
    }
}
