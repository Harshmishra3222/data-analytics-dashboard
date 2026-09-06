from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import json
import xml.etree.ElementTree as ET
import csv
import httpx
app = FastAPI(
    title="Data Analytics Dashboard API",
    description="Backend API for the data analytics dashboard project",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Temporary in-memory storage
orders_data = []
shipments_data = []
products_data = []

@app.get("/")
def root():
    return {
        "message": "Data Analytics Dashboard API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/ingest/json")
async def ingest_json(file: UploadFile = File(...)):
    global orders_data

    try:
        # Read uploaded file
        contents = await file.read()

        # Convert JSON bytes into Python dictionary
        data = json.loads(contents)

        # Check that orders exist
        if "orders" not in data:
            raise HTTPException(
                status_code=400,
                detail="JSON file must contain an 'orders' field"
            )

        flattened_rows = []

        # Process each order
        for order in data["orders"]:

            order_id = order.get("order_id")
            order_date = order.get("order_date")

            # Customer information
            customer = order.get("customer", {})
            customer_id = customer.get("id")
            customer_name = customer.get("name")

            # Process each item
            for item in order.get("items", []):

                product_id = item.get("product_id")
                qty = item.get("qty", 0)
                price = item.get("price", 0)

                # Calculate item total
                item_total = qty * price

                flattened_rows.append({
                    "order_id": order_id,
                    "customer_id": customer_id,
                    "customer_name": customer_name,
                    "product_id": product_id,
                    "qty": qty,
                    "price": price,
                    "item_total": item_total,
                    "order_date": order_date
                })

        # Store processed data in memory
        orders_data = flattened_rows

        return {
            "message": "JSON ingested successfully",
            "rows_processed": len(flattened_rows),
            "data": flattened_rows
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON file"
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing JSON: {str(e)}"
        )

def join_orders_with_shipments():

    joined_data = []

    # Go through every order item
    for order in orders_data:

        order_id = order["order_id"]
        product_id = order["product_id"]

        # Find matching shipment
        shipment = next(
            (
                s for s in shipments_data
                if s["order_id"] == order_id
            ),
            None
        )

        # Find matching product
        product = next(
            (
                p for p in products_data
                if p["product_id"] == product_id
            ),
            None
        )

        joined_row = {
    **order,
    "product_name": product["product_name"] if product else None,
    "category": product["category"] if product else None,
    "shipment_id": shipment["shipment_id"] if shipment else None,
    "delivery_days": shipment["delivery_days"] if shipment else None,
    "delivery_status": shipment["status"] if shipment else "Unknown",
    "delivery_delay_flag": (
        shipment["status"].lower() == "delayed"
        if shipment and shipment["status"]
        else False
    )
}

        joined_data.append(joined_row)

    return joined_data


@app.get("/analytics/joined")
def get_joined_data():
    return {
        "data": join_orders_with_shipments()
    }
@app.get("/analytics/summary")
def analytics_summary():

    # Total number of unique orders
    total_orders = len(
        set(row["order_id"] for row in orders_data)
    )

    # Total revenue
    total_revenue = sum(
        row["item_total"]
        for row in orders_data
    )

    # Get fully joined data
    joined_data = join_orders_with_shipments()

    # Count delayed orders
    delayed_orders = len(
        set(
            row["order_id"]
            for row in joined_data
            if row["delivery_delay_flag"]
        )
    )

    # Category-wise revenue
    category_revenue = {}

    for row in joined_data:

        category = row["category"]

        if category:
            category_revenue[category] = (
                category_revenue.get(category, 0)
                + row["item_total"]
            )
                # Revenue by order date
    revenue_trend = {}

    for row in joined_data:

        order_date = row["order_date"]

        if order_date:
            revenue_trend[order_date] = (
                revenue_trend.get(order_date, 0)
                + row["item_total"]
            )

    # Delivery performance
    delivery_performance = {
        "Delivered": 0,
        "Delayed": 0,
        "Unknown": 0
    }

    for row in joined_data:

        status = row["delivery_status"]

        if status in delivery_performance:
            delivery_performance[status] += 1
        else:
            delivery_performance["Unknown"] += 1

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "delayed_orders": delayed_orders,
        "category_revenue": category_revenue,
        "delivery_performance": delivery_performance,
        "revenue_trend": revenue_trend,
        "joined_data": joined_data
    }
@app.post("/ingest/xml")
async def ingest_xml(file: UploadFile = File(...)):
    global shipments_data

    try:
        # Read uploaded XML file
        contents = await file.read()

        # Parse XML
        root = ET.fromstring(contents)

        parsed_shipments = []

        # Process each shipment
        for shipment in root.findall("shipment"):

            shipment_id = shipment.findtext("shipment_id")
            order_id = shipment.findtext("order_id")
            delivery_days = shipment.findtext("delivery_days")
            status = shipment.findtext("status")

            # Convert delivery_days from string to integer
            if delivery_days is not None:
                delivery_days = int(delivery_days)

            parsed_shipments.append({
                "shipment_id": shipment_id,
                "order_id": order_id,
                "delivery_days": delivery_days,
                "status": status
            })

        # Store processed shipment data
        shipments_data = parsed_shipments

        return {
            "message": "XML ingested successfully",
            "rows_processed": len(parsed_shipments),
            "data": parsed_shipments
        }

    except ET.ParseError:
        raise HTTPException(
            status_code=400,
            detail="Invalid XML file"
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="delivery_days must be a number"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing XML: {str(e)}"
        )
@app.get("/analytics/currency")
async def currency_conversion():

    # Get the actual total revenue from the orders
    total_revenue = sum(
        row["item_total"]
        for row in orders_data
    )

    from_currency = "INR"
    to_currency = "USD"

    url = (
        f"https://api.frankfurter.dev/v1/latest"
        f"?base={from_currency}&symbols={to_currency}"
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

        response.raise_for_status()

        data = response.json()

        rate = data["rates"][to_currency]
        converted_amount = round(total_revenue * rate, 2)

        return {
            "original_amount": total_revenue,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "exchange_rate": rate,
            "converted_amount": converted_amount
        }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Currency API error: {str(e)}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error converting currency: {str(e)}"
        )
@app.post("/ingest/csv")
async def ingest_csv(file: UploadFile = File(...)):
    global products_data

    try:
        # Read uploaded CSV file
        contents = await file.read()

        # Convert bytes to text
        text = contents.decode("utf-8-sig")

        # Read the CSV
        reader = csv.reader(text.splitlines())

        parsed_products = []

        for row in reader:

            # Skip empty rows
            if not row:
                continue

            # Each row is currently being read as one quoted string,
            # so split it manually using commas.
            values = [value.strip() for value in row[0].split(",")]

            # Skip header row
            if values[0].lower() == "productid":
                continue

            # Make sure the row has 3 values
            if len(values) != 3:
                continue

            parsed_products.append({
                "product_id": values[0],
                "product_name": values[1],
                "category": values[2]
            })

        # Store products in memory
        products_data = parsed_products

        return {
            "message": "CSV ingested successfully",
            "rows_processed": len(parsed_products),
            "data": parsed_products
        }

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV file must be UTF-8 encoded"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing CSV: {str(e)}"
        )