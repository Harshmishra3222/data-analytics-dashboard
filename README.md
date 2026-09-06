# Data Analytics Dashboard

A full-stack data analytics dashboard built with **FastAPI** and **React**.

The application ingests order, shipment, and product data from JSON, XML, and CSV files, processes and joins the datasets, calculates business metrics, and presents the results through an interactive dashboard.

## Features

- JSON order data ingestion
- XML shipment data ingestion
- CSV product data ingestion
- Nested JSON flattening
- Orders + Shipments + Products joining
- Item total calculation
- Delivery delay flag
- Category-wise revenue aggregation
- Revenue trend analysis
- Delivery performance analysis
- INR to USD currency conversion using an external API
- KPI cards
- Interactive charts
- Category filter
- Delivery status filter
- Date range filter
- Reset filters
- Loading and error states
- Empty-data handling
- Responsive dashboard layout

## Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn
- HTTPX

### Frontend

- React
- Vite
- Recharts
- CSS

## Project Structure

```text
data-analytics-dashboard/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
├── Orders.json
├── Shipment.xml
└── Products.csv