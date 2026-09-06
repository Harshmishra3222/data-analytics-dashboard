import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import "./App.css";

function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/analytics/summary")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        return response.json();
      })
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  // Filter data based on all selected filters
  const filteredRows = summary.joined_data.filter((row) => {
    const categoryMatches =
      selectedCategory === "All" ||
      row.category === selectedCategory;

    const statusMatches =
      selectedStatus === "All" ||
      row.delivery_status === selectedStatus;

    const startDateMatches =
      startDate === "" ||
      row.order_date >= startDate;

    const endDateMatches =
      endDate === "" ||
      row.order_date <= endDate;

    return (
      categoryMatches &&
      statusMatches &&
      startDateMatches &&
      endDateMatches
    );
  });

  // -----------------------------
  // KPI calculations
  // -----------------------------

  const filteredOrderIds = new Set(
    filteredRows.map((row) => row.order_id)
  );

  const filteredTotalOrders = filteredOrderIds.size;

  const filteredTotalRevenue = filteredRows.reduce(
    (total, row) => total + row.item_total,
    0
  );

  const filteredDelayedOrders = new Set(
    filteredRows
      .filter((row) => row.delivery_delay_flag)
      .map((row) => row.order_id)
  ).size;

  // -----------------------------
  // Category-wise Revenue
  // -----------------------------

  const categoryRevenueMap = {};

  filteredRows.forEach((row) => {
    const category = row.category || "Unknown";

    categoryRevenueMap[category] =
      (categoryRevenueMap[category] || 0) + row.item_total;
  });

  const filteredCategoryData = Object.entries(categoryRevenueMap).map(
    ([category, revenue]) => ({
      category,
      revenue
    })
  );

  // -----------------------------
  // Delivery Performance
  // -----------------------------

  const deliveryPerformanceMap = {};

  filteredRows.forEach((row) => {
    const status = row.delivery_status || "Unknown";

    deliveryPerformanceMap[status] =
      (deliveryPerformanceMap[status] || 0) + 1;
  });

  const deliveryData = Object.entries(deliveryPerformanceMap).map(
    ([status, count]) => ({
      status,
      count
    })
  );

  // -----------------------------
  // Revenue Trend
  // -----------------------------

  const revenueTrendMap = {};

  filteredRows.forEach((row) => {
    const date = row.order_date;

    if (date) {
      revenueTrendMap[date] =
        (revenueTrendMap[date] || 0) + row.item_total;
    }
  });

  const revenueTrendData = Object.entries(revenueTrendMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, revenue]) => ({
      date,
      revenue
    }));

  // -----------------------------
  // Dashboard UI
  // -----------------------------

  return (
    <div className="dashboard">

      {/* Header */}
      <header className="dashboard-header">
        <h1>Data Analytics Dashboard</h1>
        <p>Business performance overview</p>
      </header>

      {/* Filters */}
      <div className="filters">

        {/* Category Filter */}
        <div className="filter-group">
          <label htmlFor="category-filter">
            Category:
          </label>

          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
          >
            <option value="All">
              All Categories
            </option>

            {Object.keys(summary.category_revenue).map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              )
            )}
          </select>
        </div>

        {/* Delivery Status Filter */}
        <div className="filter-group">
          <label htmlFor="status-filter">
            Delivery Status:
          </label>

          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value)
            }
          >
            <option value="All">
              All Statuses
            </option>

            <option value="Delivered">
              Delivered
            </option>

            <option value="Delayed">
              Delayed
            </option>

            <option value="Unknown">
              Unknown
            </option>
          </select>
        </div>

        {/* Start Date */}
        <div className="filter-group">
          <label htmlFor="start-date">
            Start Date:
          </label>

          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
          />
        </div>

        {/* End Date */}
        <div className="filter-group">
          <label htmlFor="end-date">
            End Date:
          </label>

          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
          />
        </div>
        <button
  className="reset-button"
  onClick={() => {
    setSelectedCategory("All");
    setSelectedStatus("All");
    setStartDate("");
    setEndDate("");
  }}
>
  Reset Filters
</button>

      </div>

      {/* KPI Cards */}
      <section className="kpi-grid">
        {filteredRows.length === 0 && (
  <div className="empty-state">
    No data available for the selected filters.
  </div>
)}

        <div className="kpi-card">
          <p className="kpi-title">
            Total Orders
          </p>

          <h2>
            {filteredTotalOrders}
          </h2>
        </div>

        <div className="kpi-card">
          <p className="kpi-title">
            Total Revenue
          </p>

          <h2>
            ₹{filteredTotalRevenue.toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="kpi-card">
          <p className="kpi-title">
            Delayed Orders
          </p>

          <h2>
            {filteredDelayedOrders}
          </h2>
        </div>

      </section>

      {/* Category + Delivery charts */}
      <div className="chart-grid">

        {/* Category-wise Revenue */}
        <section className="chart-card">

          <div className="chart-header">
            <h2>Category-wise Revenue</h2>
            <p>Revenue by product category</p>
          </div>

          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart data={filteredCategoryData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="category" />

                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    `₹${value.toLocaleString("en-IN")}`
                  }
                />

                <Bar
                  dataKey="revenue"
                  name="Revenue"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

        </section>

        {/* Delivery Performance */}
        <section className="chart-card">

          <div className="chart-header">
            <h2>Delivery Performance</h2>
            <p>Orders by delivery status</p>
          </div>

          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <PieChart>

                <Pie
                  data={deliveryData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                >
                  {deliveryData.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </section>

      </div>

      {/* Revenue Trend */}
      <section className="chart-card">

        <div className="chart-header">
          <h2>Revenue Trend</h2>
          <p>Revenue over time</p>
        </div>

        <div className="chart-container">

          <ResponsiveContainer
            width="100%"
            height={350}
          >
            <LineChart data={revenueTrendData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="date" />

              <YAxis />

              <Tooltip
                formatter={(value) =>
                  `₹${value.toLocaleString("en-IN")}`
                }
              />

              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </section>

    </div>
  );
}

export default App;