import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AuthPage from "./AuthPage";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/transactions";

const CHART_COLORS = ["#34d399", "#facc15", "#60a5fa", "#f97316", "#c084fc", "#fb7185"];

const EMPTY_FORM = {
  title: "",
  amount: "",
  category: "Food",
  type: "EXPENSE",
  transactionDate: new Date().toISOString().split("T")[0],
  notes: "",
};

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  return toMonthKey(new Date(year, month - 1 + amount, 1));
}

function monthLabel(monthKey) {
  if (monthKey === "all") {
    return "All time";
  }

  return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(toMonthKey(new Date()));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("smartspend_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const currentMonth = toMonthKey(new Date());
  const previousMonth = shiftMonth(currentMonth, -1);

  const filteredTransactions =
    selectedMonth === "all"
      ? transactions
      : transactions.filter((transaction) =>
          transaction.transactionDate.startsWith(selectedMonth)
        );

  const summary = filteredTransactions.reduce(
    (totals, transaction) => {
      const amount = Number(transaction.amount);

      if (transaction.type === "INCOME") {
        totals.income += amount;
      } else {
        totals.expenses += amount;
      }

      return totals;
    },
    { income: 0, expenses: 0 }
  );

  const savings = summary.income - summary.expenses;
  const savingsRate =
    summary.income > 0 ? Math.max((savings / summary.income) * 100, 0) : 0;

  const expenseTransactions = filteredTransactions.filter(
    (transaction) => transaction.type === "EXPENSE"
  );

  const largestExpense = expenseTransactions.reduce(
    (largest, transaction) =>
      !largest || Number(transaction.amount) > Number(largest.amount)
        ? transaction
        : largest,
    null
  );

  const categoryData = Object.entries(
    expenseTransactions.reduce((totals, transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] || 0) + Number(transaction.amount);
      return totals;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyExpenseData = Array.from({ length: 6 }, (_, index) => {
    const anchorMonth =
      selectedMonth === "all" ? currentMonth : selectedMonth;
    const key = shiftMonth(anchorMonth, index - 5);

    const expenses = transactions
      .filter(
        (transaction) =>
          transaction.type === "EXPENSE" &&
          transaction.transactionDate.startsWith(key)
      )
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

    return {
      month: new Date(`${key}-01T12:00:00`).toLocaleDateString("en-IN", {
        month: "short",
      }),
      expenses,
    };
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Could not load financial data.");
      }

      setTransactions(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogin(userInfo) {
    localStorage.setItem("smartspend_user", JSON.stringify(userInfo));
    setUser(userInfo);
  }

  function handleLogout() {
    localStorage.removeItem("smartspend_user");
    setUser(null);
  }

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  function changeMonth(amount) {
    if (selectedMonth === "all") {
      setSelectedMonth(currentMonth);
      return;
    }

    setSelectedMonth(shiftMonth(selectedMonth, amount));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const isEditing = editingId !== null;
    const requestUrl = isEditing ? `${API_URL}/${editingId}` : API_URL;

    try {
      const response = await fetch(requestUrl, {
        method: isEditing ? "PUT" : "POST",
       headers: {
  "Content-Type": "application/json",
  "X-User-Id": user.id,
},     body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      if (!response.ok) {
        throw new Error(
          isEditing
            ? "Could not update the transaction."
            : "Could not save the transaction."
        );
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(transaction) {
    setForm({
      title: transaction.title,
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
      transactionDate: transaction.transactionDate,
      notes: transaction.notes || "",
    });

    setEditingId(transaction.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this transaction?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
  method: "DELETE",
  headers: {
    "X-User-Id": user.id,
  },
});

      if (!response.ok) {
        throw new Error("Could not delete the transaction.");
      }

      if (editingId === id) {
        cancelEdit();
      }

      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-brand">
          <span className="dashboard-kicker">YOUR PERSONAL FINANCE SPACE</span>
          <h1 className="dashboard-title">SmartSpend</h1>
          <p className="dashboard-subtitle">
            Build clarity, grow savings, spend with intention.
          </p>
        </div>

        <div className="user-panel">
          <span>Welcome back, {user.name}</span>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="month-navigation">
        <button
          type="button"
          className="month-arrow"
          onClick={() => changeMonth(-1)}
          disabled={selectedMonth === "all"}
        >
          ←
        </button>

        <div>
          <span>Dashboard period</span>
          <strong>{monthLabel(selectedMonth)}</strong>
        </div>

        <button
          type="button"
          className="month-arrow"
          onClick={() => changeMonth(1)}
          disabled={selectedMonth === "all" || selectedMonth === currentMonth}
        >
          →
        </button>

        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          <option value={currentMonth}>This month</option>
          <option value={previousMonth}>Last month</option>
          <option value="all">All time</option>
        </select>
      </section>

      <section className="transaction-section">
        <div className="section-heading">
          <div>
            <span>QUICK ENTRY</span>
            <h2>{editingId ? "Edit transaction" : "Add transaction"}</h2>
          </div>
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>
          <input
            name="title"
            placeholder="Title (example: Groceries)"
            value={form.title}
            onChange={handleChange}
            required
          />

          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={handleChange}
            required
          />

          <select name="type" value={form.type} onChange={handleChange}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>

          <select name="category" value={form.category} onChange={handleChange}>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Salary">Salary</option>
            <option value="Other">Other</option>
          </select>

          <input
            name="transactionDate"
            type="date"
            value={form.transactionDate}
            onChange={handleChange}
            required
          />

          <input
            name="notes"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={handleChange}
          />

          <button type="submit">
            {editingId ? "Update transaction" : "Save transaction"}
          </button>

          {editingId && (
            <button type="button" className="cancel-button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </section>

      {error && <p className="error-message">{error}</p>}

      {isLoading ? (
        <p className="loading-message">Loading your dashboard...</p>
      ) : (
        <>
          <section className="overview-section">
            <div className="section-heading">
              <div>
                <span>MONTHLY OVERVIEW</span>
                <h2>{monthLabel(selectedMonth)}</h2>
              </div>
            </div>

            <div className="summary-grid">
              <article className="summary-card income-card">
                <span>Income</span>
                <strong>{formatCurrency(summary.income)}</strong>
                <small>Money received</small>
              </article>

              <article className="summary-card expense-card">
                <span>Expenses</span>
                <strong>{formatCurrency(summary.expenses)}</strong>
                <small>Money spent</small>
              </article>

              <article className="summary-card savings-card">
                <span>Savings</span>
                <strong>{formatCurrency(savings)}</strong>
                <small>Income minus expenses</small>
              </article>

              <article className="summary-card rate-card">
                <span>Savings rate</span>
                <strong>{savingsRate.toFixed(1)}%</strong>
                <small>Of total income saved</small>
              </article>
            </div>

            <article className="largest-expense-card">
              <div className="largest-expense-icon">↑</div>
              <div>
                <span>Largest expense this period</span>
                <strong>
                  {largestExpense
                    ? `${largestExpense.title} — ${formatCurrency(largestExpense.amount)}`
                    : "No expenses recorded"}
                </strong>
                <small>
                  {largestExpense
                    ? `${largestExpense.category} · ${largestExpense.transactionDate}`
                    : "Add an expense to see an insight here."}
                </small>
              </div>
            </article>
          </section>

          <section className="charts-grid">
            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <span>EXPENSE SPLIT</span>
                  <h2>Where your money went</h2>
                </div>
              </div>

              {categoryData.length === 0 ? (
                <p className="empty-chart">No expense data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={290}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={58}
                      outerRadius={94}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <text
  x="50%"
  y="41%"
  textAnchor="middle"
  className="donut-center-label"
>
  Total spent
</text>

<text
  x="50%"
  y="51%"
  textAnchor="middle"
  className="donut-center-value"
>
  {formatCurrency(summary.expenses)}
</text>
                    
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={38} />
                  </PieChart>


                </ResponsiveContainer>
              )}
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <span>SPENDING TREND</span>
                  <h2>Last six months</h2>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={monthlyExpenseData}>
                  <XAxis dataKey="month" stroke="#9fb4aa" />
                  <YAxis
                    stroke="#9fb4aa"
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#34d399"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </section>

          <section className="transactions-section">
            <div className="section-heading">
              <div>
                <span>TRANSACTION HISTORY</span>
                <h2>Recent transactions</h2>
              </div>
              <strong>{filteredTransactions.length} records</strong>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="empty-transactions">
                No transactions found for {monthLabel(selectedMonth)}.
              </p>
            ) : (
              <ul className="transaction-list">
                {filteredTransactions.map((transaction) => (
                  <li className="transaction-item" key={transaction.id}>
                    <div className={`transaction-symbol ${transaction.type.toLowerCase()}`}>
                      {transaction.type === "INCOME" ? "+" : "−"}
                    </div>

                    <div className="transaction-details">
                      <strong>{transaction.title}</strong>
                      <span>
                        {transaction.category} · {transaction.transactionDate}
                        {transaction.notes ? ` · ${transaction.notes}` : ""}
                      </span>
                    </div>

                    <strong className={`transaction-amount ${transaction.type.toLowerCase()}`}>
                      {transaction.type === "INCOME" ? "+" : "−"}
                      {formatCurrency(transaction.amount)}
                    </strong>

                    <div className="transaction-actions">
                      <button type="button" onClick={() => handleEdit(transaction)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default App;