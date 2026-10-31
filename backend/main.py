
import qrcode
import io
import base64
import secrets
import os
import razorpay
from dotenv import load_dotenv
from pwdlib import PasswordHash
from pydantic import EmailStr
from pydantic import BaseModel, Field, EmailStr
from datetime import date, datetime, time, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import Error
from backend.database import get_db_connection


load_dotenv()
password_hash = PasswordHash.recommended()

razorpay_key_id = os.getenv("RAZORPAY_KEY_ID", "")
razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

razorpay_client = razorpay.Client(
    auth=(razorpay_key_id, razorpay_key_secret)
)

print("Razorpay Key ID loaded:", bool(razorpay_key_id))
print("Razorpay Secret loaded:", bool(razorpay_key_secret))

class RegistrationRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)
    gender: str | None = Field(default=None, max_length=10)
    date_of_birth: date | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PaymentRequest(BaseModel):
    booking_id: int = Field(gt=0)
    payment_method: str = Field(min_length=1, max_length=30)


class PaymentVerificationRequest(BaseModel):
    booking_id: int = Field(gt=0)
    razorpay_order_id: str = Field(min_length=1, max_length=100)
    razorpay_payment_id: str = Field(min_length=1, max_length=100)
    razorpay_signature: str = Field(min_length=1, max_length=255)


app = FastAPI(title="Metro Reservation System API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PassengerRequest(BaseModel):
    passenger_name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=1, le=120)
    gender: str = Field(min_length=1, max_length=10)


class BookingRequest(BaseModel):
    user_id: int = Field(gt=0)
    schedule_id: int = Field(gt=0)
    source_station_id: int = Field(gt=0)
    destination_station_id: int = Field(gt=0)
    number_of_tickets: int = Field(gt=0, le=10)
    passengers: list[PassengerRequest]



@app.get("/")
def home():
    return {
        "message": "Metro Reservation System backend is running!"
    }


@app.get("/db-test")
def test_database():
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE()")
        result = cursor.fetchone()
        cursor.close()

        return {
            "message": "MySQL connection successful!",
            "database": result[0],
        }

    except Error as error:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed. Check MySQL and your .env settings.",
        ) from error

    finally:
        if connection is not None and connection.is_connected():
            connection.close()


@app.get("/stations")
def get_stations():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT station_id, station_name, station_code, line_name
            FROM stations
            ORDER BY station_id
        """)

        stations = cursor.fetchall()

        return {
            "total": len(stations),
            "stations": stations,
        }

    except Error as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve stations from the database.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()




class StationCreate(BaseModel):
    station_name: str = Field(min_length=1, max_length=100)
    station_code: str = Field(min_length=1, max_length=20)
    line_name: str = Field(min_length=1, max_length=100)
    city: str | None = Field(default=None, max_length=100)


@app.post("/stations")
def add_station(station: StationCreate):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO stations
                (station_name, station_code, line_name, city)
            VALUES (%s, %s, %s, %s)
            """,
            (
                station.station_name.strip(),
                station.station_code.strip().upper(),
                station.line_name.strip(),
                station.city.strip() if station.city else None,
            ),
        )

        connection.commit()

        return {
            "message": "Station added successfully.",
            "station_id": cursor.lastrowid,
        }

    except Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        if error.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="This station code already exists.",
            ) from error

        raise HTTPException(
            status_code=500,
            detail="Could not add station to the database.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


class StationUpdate(BaseModel):
    station_name: str = Field(min_length=1, max_length=100)


@app.put("/stations/{station_id}")
def update_station(station_id: int, station: StationUpdate):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE stations
            SET station_name = %s
            WHERE station_id = %s
            """,
            (station.station_name.strip(), station_id),
        )

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT station_id FROM stations WHERE station_id = %s",
                (station_id,),
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Station not found.",
                )

        connection.commit()

        return {
            "message": "Station updated successfully.",
            "station_id": station_id,
        }

    except HTTPException:
        raise

    except Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not update station.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@app.delete("/stations/{station_id}")
def delete_station(station_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check whether the station exists.
        cursor.execute(
            "SELECT station_id FROM stations WHERE station_id = %s",
            (station_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Station not found.",
            )

        # Delete only if no route references this station.
        cursor.execute(
            "SELECT 1 FROM route_stations WHERE station_id = %s LIMIT 1",
            (station_id,),
        )

        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete this station because it is linked to a route.",
            )

        cursor.execute(
            "DELETE FROM stations WHERE station_id = %s",
            (station_id,),
        )

        connection.commit()

        return {
            "message": "Station deleted successfully.",
            "station_id": station_id,
        }

    except HTTPException:
        raise

    except Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not delete station.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()

@app.get("/routes")
def get_routes():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                r.route_id,
                r.route_name,
                r.source_station_id,
                source.station_name AS source_station,
                r.destination_station_id,
                destination.station_name AS destination_station,
                r.distance_km,
                r.estimated_duration,
                r.base_fare
            FROM routes r
            JOIN stations source
                ON r.source_station_id = source.station_id
            JOIN stations destination
                ON r.destination_station_id = destination.station_id
            ORDER BY r.route_id
        """)

        routes = cursor.fetchall()

        return {
            "total": len(routes),
            "routes": routes,
        }

    except Error as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve routes from the database.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


class RouteFareUpdate(BaseModel):
    base_fare: float = Field(gt=0, le=999999.99)


@app.put("/routes/{route_id}/fare")
def update_route_fare(route_id: int, fare_data: RouteFareUpdate):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT route_id FROM routes WHERE route_id = %s",
            (route_id,)
        )

        route = cursor.fetchone()

        if route is None:
            raise HTTPException(
                status_code=404,
                detail="Route not found."
            )

        cursor.execute(
            "UPDATE routes SET base_fare = %s WHERE route_id = %s",
            (fare_data.base_fare, route_id)
        )

        connection.commit()

        return {
            "message": "Route fare updated successfully.",
            "route_id": route_id,
            "base_fare": fare_data.base_fare
        }

    except HTTPException:
        raise

    except Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not update route fare."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()



@app.get("/search-route")
def search_route(source_station_id: int, destination_station_id: int):
    if source_station_id == destination_station_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination stations must be different.",
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                r.route_id,
                r.route_name,
                src.station_name AS source_station,
                dest.station_name AS destination_station,

                ROUND(
                    ABS(dest_rs.distance_from_start - src_rs.distance_from_start),
                    2
                ) AS distance_km,

                ROUND(
                    r.estimated_duration
                    * (
                        ABS(dest_rs.distance_from_start - src_rs.distance_from_start)
                    )
                    / NULLIF(r.distance_km, 0)
                ) AS estimated_duration,

                ROUND(
                    r.base_fare
                    * (
                        ABS(dest_rs.distance_from_start - src_rs.distance_from_start)
                    )
                    / NULLIF(r.distance_km, 0),
                    2
                ) AS base_fare

            FROM routes r

            JOIN route_stations src_rs
                ON r.route_id = src_rs.route_id

            JOIN stations src
                ON src_rs.station_id = src.station_id

            JOIN route_stations dest_rs
                ON r.route_id = dest_rs.route_id

            JOIN stations dest
                ON dest_rs.station_id = dest.station_id

            WHERE src_rs.station_id = %s
              AND dest_rs.station_id = %s
              AND src_rs.distance_from_start IS NOT NULL
              AND dest_rs.distance_from_start IS NOT NULL

            LIMIT 1
            """,
            (source_station_id, destination_station_id),
        )

        route = cursor.fetchone()

        if route is None:
            raise HTTPException(
                status_code=404,
                detail="No direct route found for these stations.",
            )

        return route

    except Error as error:
        raise HTTPException(
            status_code=500,
            detail="Could not search for the route.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


def generate_schedules(travel_date: date):
    if travel_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Travel date cannot be in the past.",
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Get the routes and their journey durations
        cursor.execute("""
            SELECT route_id, estimated_duration
            FROM routes
            ORDER BY route_id
        """)
        routes = cursor.fetchall()

        if not routes:
            raise HTTPException(
                status_code=404,
                detail="No routes are available.",
            )

        # Get active metro units
        cursor.execute("""
            SELECT metro_id, capacity
            FROM metros
            WHERE status = 'Active'
            ORDER BY metro_id
        """)
        metros = cursor.fetchall()

        if not metros:
            raise HTTPException(
                status_code=404,
                detail="No active metro units are available.",
            )

        # Generate departures from 05:30 to 23:30 every 15 minutes
        departure = datetime.combine(travel_date, time(5, 30))
        final_departure = datetime.combine(travel_date, time(23, 30))

        inserted = 0

        while departure <= final_departure:
            for route in routes:
                # Assign an active metro unit to this trip
                metro = metros[
                    (route["route_id"] + departure.hour * 4
                     + departure.minute // 15) % len(metros)
                ]

                arrival = departure + timedelta(
                    minutes=route["estimated_duration"] or 0
                )

                cursor.execute(
                    """
                    INSERT INTO schedules (
                        metro_id,
                        route_id,
                        schedule_date,
                        departure_time,
                        arrival_time,
                        available_seats,
                        running_status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, 'Scheduled')
                    ON DUPLICATE KEY UPDATE
                        schedule_id = schedule_id
                    """,
                    (
                        metro["metro_id"],
                        route["route_id"],
                        travel_date,
                        departure.time(),
                        arrival.time(),
                        metro["capacity"],
                    ),
                )

                if cursor.rowcount == 1:
                    inserted += 1

            departure += timedelta(minutes=15)

        connection.commit()

        return {
            "message": "Schedule generation completed.",
            "travel_date": travel_date.isoformat(),
            "routes_processed": len(routes),
            "new_schedules_created": inserted,
        }

    except Error as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not generate schedules. Check the database settings.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()



@app.get("/schedules")
def get_schedules(
    travel_date: date,
    route_id: int,
    source_station_id: int,
    destination_station_id: int,
):
    if source_station_id == destination_station_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination stations must be different.",
        )
    # Create the daily timetable for this date if it does not exist yet.
    generate_schedules(travel_date)
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                s.schedule_id,
                s.schedule_date,

                ADDTIME(
                    s.departure_time,
                    SEC_TO_TIME(
                        ROUND(
                            r.estimated_duration
                            * LEAST(src_rs.distance_from_start, dest_rs.distance_from_start)
                            / NULLIF(r.distance_km, 0)
                            * 60
                        )
                    )
                ) AS departure_time,

                ADDTIME(
                    s.departure_time,
                    SEC_TO_TIME(
                        ROUND(
                            r.estimated_duration
                            * GREATEST(src_rs.distance_from_start, dest_rs.distance_from_start)
                            / NULLIF(r.distance_km, 0)
                            * 60
                        )
                    )
                ) AS arrival_time,

                s.available_seats,
                s.running_status,
                r.route_id,
                r.route_name,
                src.station_name AS source_station,
                dest.station_name AS destination_station,

                ROUND(
                    ABS(dest_rs.distance_from_start - src_rs.distance_from_start),
                    2
                ) AS distance_km,

                ROUND(
                    r.estimated_duration
                    * (
                        ABS(dest_rs.distance_from_start - src_rs.distance_from_start)
                    )
                    / NULLIF(r.distance_km, 0)
                ) AS journey_duration_minutes,

                ROUND(
                    r.base_fare
                    * (
                        ABS(dest_rs.distance_from_start - src_rs.distance_from_start)
                    )
                    / NULLIF(r.distance_km, 0),
                    2
                ) AS fare

            FROM schedules s
            JOIN routes r
                ON s.route_id = r.route_id

            JOIN route_stations src_rs
                ON r.route_id = src_rs.route_id
               AND src_rs.station_id = %s

            JOIN route_stations dest_rs
                ON r.route_id = dest_rs.route_id
               AND dest_rs.station_id = %s

            JOIN stations src
                ON src.station_id = src_rs.station_id

            JOIN stations dest
                ON dest.station_id = dest_rs.station_id

            WHERE s.schedule_date = %s
  AND s.route_id = %s
  AND s.running_status = 'Scheduled'
  AND s.available_seats > 0
  AND (
      s.schedule_date > CURDATE()
      OR (
          s.schedule_date = CURDATE()
          AND ADDTIME(
              s.departure_time,
              SEC_TO_TIME(
                  ROUND(
                      r.estimated_duration
                      * LEAST(
                          src_rs.distance_from_start,
                          dest_rs.distance_from_start
                      )
                      / NULLIF(r.distance_km, 0)
                      * 60
                  )
              )
          ) > CURTIME()
      )
  )
              AND src_rs.distance_from_start IS NOT NULL
              AND dest_rs.distance_from_start IS NOT NULL

            ORDER BY departure_time
            """,
            (
                source_station_id,
                destination_station_id,
                travel_date,
                route_id,
            ),
        )

        schedules = cursor.fetchall()

        return {
            "travel_date": travel_date.isoformat(),
            "total": len(schedules),
            "schedules": schedules,
        }

    except Error as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve schedules.",
        ) from error

    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()



@app.post("/bookings")
def create_booking(booking: BookingRequest):
    if len(booking.passengers) != booking.number_of_tickets:
        raise HTTPException(
            status_code=400,
            detail="The number of passengers must match the number of tickets."
        )

    if booking.source_station_id == booking.destination_station_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination stations must be different."
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Lock the selected schedule and retrieve its route.
        cursor.execute(
            """
            SELECT
                s.schedule_id,
                s.route_id,
                s.schedule_date,
                s.available_seats,
                s.running_status,
                r.base_fare,
                r.distance_km
            FROM schedules s
            JOIN routes r ON r.route_id = s.route_id
            WHERE s.schedule_id = %s
            FOR UPDATE
            """,
            (booking.schedule_id,)
        )
        schedule = cursor.fetchone()

        if schedule is None:
            raise HTTPException(
                status_code=404,
                detail="Schedule not found."
            )

        if schedule["running_status"] != "Scheduled":
            raise HTTPException(
                status_code=400,
                detail="This schedule is not available for booking."
            )

        if schedule["schedule_date"] < date.today():
            raise HTTPException(
                status_code=400,
                detail="This schedule is in the past."
            )

        # Validate the selected segment against this route.
        cursor.execute(
            """
            SELECT
                src_rs.stop_order AS source_order,
                dest_rs.stop_order AS destination_order,
                src_rs.distance_from_start AS source_distance,
                dest_rs.distance_from_start AS destination_distance,
                ROUND(
                    r.base_fare
                    * (
                       ABS(dest_rs.distance_from_start - src_rs.distance_from_start)
                    )
                    / NULLIF(r.distance_km, 0),
                    2
                ) AS segment_fare
            FROM routes r
            JOIN route_stations src_rs
                ON src_rs.route_id = r.route_id
               AND src_rs.station_id = %s
            JOIN route_stations dest_rs
                ON dest_rs.route_id = r.route_id
               AND dest_rs.station_id = %s
            WHERE r.route_id = %s
              
              AND src_rs.distance_from_start IS NOT NULL
              AND dest_rs.distance_from_start IS NOT NULL
              AND r.distance_km > 0
            """,
            (
                booking.source_station_id,
                booking.destination_station_id,
                schedule["route_id"],
            )
        )
        segment = cursor.fetchone()

        if segment is None:
            raise HTTPException(
                status_code=400,
                detail="These stations are not a valid forward journey on this route."
            )

        if schedule["available_seats"] < booking.number_of_tickets:
            raise HTTPException(
                status_code=400,
                detail="Not enough seats available."
            )

        # Verify that the user exists.
        cursor.execute(
            "SELECT user_id FROM users WHERE user_id = %s",
            (booking.user_id,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="User not found. Register before booking."
            )

        # Calculate the amount from the selected segment, not the full route.
        total_amount = (
            segment["segment_fare"] * booking.number_of_tickets
        )

        cursor.execute(
            """
            INSERT INTO bookings (
                user_id,
                schedule_id,
                source_station_id,
                destination_station_id,
                journey_date,
                number_of_tickets,
                total_amount,
                booking_status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')
            """,
            (
                booking.user_id,
                booking.schedule_id,
                booking.source_station_id,
                booking.destination_station_id,
                schedule["schedule_date"],
                booking.number_of_tickets,
                total_amount,
            )
        )

        booking_id = cursor.lastrowid

        # Save each passenger.
        for passenger in booking.passengers:
            cursor.execute(
                """
                INSERT INTO passengers (
                    booking_id,
                    passenger_name,
                    age,
                    gender
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    booking_id,
                    passenger.passenger_name,
                    passenger.age,
                    passenger.gender,
                )
            )

        # Reserve seats for this schedule and date.
        cursor.execute(
            """
            UPDATE schedules
            SET available_seats = available_seats - %s
            WHERE schedule_id = %s
            """,
            (booking.number_of_tickets, booking.schedule_id)
        )

        connection.commit()

        return {
            "message": "Booking created. Payment is still pending.",
            "booking_id": booking_id,
            "schedule_id": booking.schedule_id,
            "journey_date": schedule["schedule_date"].isoformat(),
            "source_station_id": booking.source_station_id,
            "destination_station_id": booking.destination_station_id,
            "number_of_tickets": booking.number_of_tickets,
            "fare_per_ticket": str(segment["segment_fare"]),
            "total_amount": str(total_amount),
            "booking_status": "Pending",
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise

    except Error as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not create booking."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


@app.put("/users/{user_id}/bookings/{booking_id}/cancel")
def cancel_booking(user_id: int, booking_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Lock the booking and verify that it belongs to this user.
        cursor.execute(
            """
            SELECT
                b.booking_id,
                b.user_id,
                b.schedule_id,
                b.number_of_tickets,
                b.booking_status
            FROM bookings b
            WHERE b.booking_id = %s
              AND b.user_id = %s
            FOR UPDATE
            """,
            (booking_id, user_id)
        )
        booking = cursor.fetchone()

        if booking is None:
            raise HTTPException(
                status_code=404,
                detail="Booking not found for this user."
            )

        if booking["booking_status"] == "Cancelled":
            raise HTTPException(
                status_code=400,
                detail="This booking is already cancelled."
            )

        if booking["booking_status"] != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Only pending bookings can be cancelled through this endpoint."
            )

        # Lock the schedule before restoring reserved seats.
        cursor.execute(
            """
            SELECT schedule_id
            FROM schedules
            WHERE schedule_id = %s
            FOR UPDATE
            """,
            (booking["schedule_id"],)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Schedule not found."
            )

        # Do not cancel if a payment has already succeeded.
        cursor.execute(
            """
            SELECT payment_status
            FROM payments
            WHERE booking_id = %s
            """,
            (booking_id,)
        )
        payments = cursor.fetchall()

        if any(
            str(payment["payment_status"]).lower()
            in ("paid", "success", "successful", "captured", "completed")
            for payment in payments
        ):
            raise HTTPException(
                status_code=400,
                detail="This booking has a successful payment. Please use the refund process."
            )

        cursor.execute(
            """
            UPDATE bookings
            SET booking_status = 'Cancelled'
            WHERE booking_id = %s
              AND user_id = %s
            """,
            (booking_id, user_id)
        )

        cursor.execute(
            """
            UPDATE schedules
            SET available_seats = available_seats + %s
            WHERE schedule_id = %s
            """,
            (
                booking["number_of_tickets"],
                booking["schedule_id"],
            )
        )

        connection.commit()

        return {
            "message": "Booking cancelled successfully.",
            "booking_id": booking_id,
            "booking_status": "Cancelled",
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise

    except Error as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not cancel booking."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


@app.post("/register", status_code=201)
def register_user(registration: RegistrationRequest):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Check whether the email is already registered
        cursor.execute(
            "SELECT user_id FROM users WHERE email = %s",
            (registration.email,)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists."
            )

        # Hash the password before storing it
        hashed_password = password_hash.hash(registration.password)

        # Save the new user
        cursor.execute(
            """
            INSERT INTO users (
                full_name, email, phone, password,
                gender, date_of_birth
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                registration.full_name,
                registration.email,
                registration.phone,
                hashed_password,
                registration.gender,
                registration.date_of_birth
            )
        )

        user_id = cursor.lastrowid
        connection.commit()

        return {
            "message": "Registration successful.",
            "user_id": user_id,
            "full_name": registration.full_name,
            "email": registration.email
        }

    except HTTPException:
        if connection and connection.is_connected():
            connection.rollback()
        raise

    except Error as e:
        if connection and connection.is_connected():
            connection.rollback()

        if getattr(e, "errno", None) == 1062:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists."
            )

        raise HTTPException(
            status_code=500,
            detail="Registration failed due to a database error."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()



@app.post("/login")
def login_user(login: LoginRequest):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT user_id, full_name, email, password
            FROM users
            WHERE email = %s
            """,
            (login.email,)
        )

        user = cursor.fetchone()

        # Use the same password hashing system as registration
        if not user or not password_hash.verify(
            login.password, user["password"]
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )

        return {
            "message": "Login successful.",
            "user_id": user["user_id"],
            "full_name": user["full_name"],
            "email": user["email"]
        }

    except HTTPException:
        raise

    except Error:
        raise HTTPException(
            status_code=500,
            detail="Login failed due to a server error."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()



@app.post("/admin/login")
def login_admin(login: LoginRequest):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT admin_id, name, email, password
            FROM admins
            WHERE email = %s
            """,
            (login.email,)
        )

        admin = cursor.fetchone()

        # Admin passwords are stored as plain text.
        if not admin or login.password != admin["password"]:
            raise HTTPException(
                status_code=401,
                detail="Invalid admin email or password."
            )

        return {
            "message": "Admin login successful.",
            "admin_id": admin["admin_id"],
            "name": admin["name"],
            "email": admin["email"]
        }

    except HTTPException:
        raise

    except Error as error:
        print("Admin login database error:", error)
        raise HTTPException(
            status_code=500,
            detail="Admin login failed due to a server error."
        ) from error

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()



@app.get("/users/{user_id}")
def get_user_profile(user_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                user_id,
                full_name,
                email,
                phone,
                gender,
                date_of_birth,
                created_at
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        return user

    except HTTPException:
        raise

    except Error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve user profile."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.get("/users/{user_id}/bookings")
def get_user_bookings(user_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Confirm the user exists
        cursor.execute(
            "SELECT user_id FROM users WHERE user_id = %s",
            (user_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        cursor.execute(
            """
            
            
        SELECT
            b.booking_id,
            b.journey_date,
            b.number_of_tickets,
            b.total_amount,
            b.booking_status,
            b.booking_date,
            ss.station_name AS source_station,
            ds.station_name AS destination_station,
            s.departure_time,
            s.arrival_time,
            m.metro_number,
            m.metro_name,
            COALESCE(p.payment_status, 'Not initiated') AS payment_status
        FROM bookings b
        JOIN stations ss
            ON ss.station_id = b.source_station_id
        JOIN stations ds
            ON ds.station_id = b.destination_station_id
        JOIN schedules s
            ON s.schedule_id = b.schedule_id
        JOIN metros m
            ON m.metro_id = s.metro_id
        LEFT JOIN payments p
            ON p.booking_id = b.booking_id
        WHERE b.user_id = %s
        ORDER BY b.booking_date DESC


            """,
            (user_id,)
        )

        bookings = cursor.fetchall()

        return {
            "user_id": user_id,
            "total_bookings": len(bookings),
            "bookings": bookings
        }

    except HTTPException:
        raise

    except Error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve booking history."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.post("/users/{user_id}/bookings/{booking_id}/cancel")
def cancel_booking(user_id: int, booking_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                booking_id,
                schedule_id,
                number_of_tickets,
                booking_status
            FROM bookings
            WHERE booking_id = %s AND user_id = %s
            FOR UPDATE
            """,
            (booking_id, user_id)
        )

        booking = cursor.fetchone()

        if not booking:
            raise HTTPException(
                status_code=404,
                detail="Booking not found for this user."
            )

        if booking["booking_status"] == "Cancelled":
            raise HTTPException(
                status_code=400,
                detail="This booking is already cancelled."
            )

        if booking["booking_status"] != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Only pending bookings can be cancelled."
            )

        cursor.execute(
            """
            SELECT schedule_id
            FROM schedules
            WHERE schedule_id = %s
            FOR UPDATE
            """,
            (booking["schedule_id"],)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Schedule not found."
            )

        cursor.execute(
            """
            UPDATE bookings
            SET booking_status = 'Cancelled'
            WHERE booking_id = %s
              AND user_id = %s
              AND booking_status = 'Pending'
            """,
            (booking_id, user_id)
        )

        if cursor.rowcount != 1:
            raise HTTPException(
                status_code=409,
                detail="Booking status changed. Please try again."
            )

        cursor.execute(
            """
            UPDATE schedules
            SET available_seats = available_seats + %s
            WHERE schedule_id = %s
            """,
            (booking["number_of_tickets"], booking["schedule_id"])
        )

        connection.commit()

        return {
            "message": "Booking cancelled successfully.",
            "booking_id": booking_id,
            "booking_status": "Cancelled",
            "seats_released": booking["number_of_tickets"]
        }

    except HTTPException:
        if connection and connection.is_connected():
            connection.rollback()
        raise

    except Error:
        if connection and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not cancel booking."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()



@app.post("/payments", status_code=201)
def create_payment(payment: PaymentRequest):
    connection = None
    cursor = None

    if not razorpay_key_id or not razorpay_key_secret:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Check your .env file."
        )

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Lock the booking and verify that it can be paid for.
        cursor.execute(
            """
            SELECT booking_id, total_amount, booking_status
            FROM bookings
            WHERE booking_id = %s
            FOR UPDATE
            """,
            (payment.booking_id,)
        )
        booking = cursor.fetchone()

        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        if booking["booking_status"] != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Payment can only be started for a pending booking."
            )

        # Do not allow another order if payment has already succeeded.
        cursor.execute(
            """
            SELECT payment_id
            FROM payments
            WHERE booking_id = %s
              AND payment_status IN ('Success', 'Paid', 'Captured')
            LIMIT 1
            """,
            (payment.booking_id,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="This booking already has a successful payment."
            )

        # Create an order with Razorpay. Amounts sent to Razorpay
        # must be expressed in paise (INR multiplied by 100).
        amount_paise = int(
            (booking["total_amount"] * 100).quantize(
                __import__("decimal").Decimal("1")
            )
        )

        if amount_paise <= 0:
            raise HTTPException(
                status_code=400,
                detail="Booking amount must be greater than zero."
            )

        razorpay_order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"booking_{payment.booking_id}",
            "notes": {
                "booking_id": str(payment.booking_id)
            }
        })

        # Save the Razorpay order ID with the pending payment record.
        cursor.execute(
            """
            INSERT INTO payments (
                booking_id,
                razorpay_order_id,
                amount,
                payment_method,
                payment_status
            )
            VALUES (%s, %s, %s, %s, 'Pending')
            """,
            (
                payment.booking_id,
                razorpay_order["id"],
                booking["total_amount"],
                payment.payment_method
            )
        )

        payment_id = cursor.lastrowid
        connection.commit()

        return {
            "message": "Razorpay order created. Payment is pending.",
            "payment_id": payment_id,
            "booking_id": payment.booking_id,
            "razorpay_order_id": razorpay_order["id"],
            "razorpay_key_id": razorpay_key_id,
            "amount": amount_paise,
            "currency": "INR",
            "payment_status": "Pending"
        }

    except HTTPException:
        if connection and connection.is_connected():
            connection.rollback()
        raise

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        print("Razorpay order creation failed:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not create Razorpay order. Check the backend logs."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.post("/payments/verify")
def verify_payment(verification: PaymentVerificationRequest):
    connection = None
    cursor = None

    # Never accept payment confirmation without the secret key
    if not razorpay_key_id or not razorpay_key_secret:
        raise HTTPException(
            status_code=503,
            detail="Payment verification is not configured. Add Razorpay test credentials first."
        )

    try:
        import razorpay

        client = razorpay.Client(
            auth=(razorpay_key_id, razorpay_key_secret)
        )

        # Verify the signature using Razorpay's SDK
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": verification.razorpay_order_id,
                "razorpay_payment_id": verification.razorpay_payment_id,
                "razorpay_signature": verification.razorpay_signature,
            })
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Payment signature verification failed."
            )

        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Lock the booking while confirming payment
        cursor.execute(
            """
            SELECT booking_id, total_amount, booking_status
            FROM bookings
            WHERE booking_id = %s
            FOR UPDATE
            """,
            (verification.booking_id,)
        )
        booking = cursor.fetchone()

        if not booking:
            raise HTTPException(
                status_code=404,
                detail="Booking not found."
            )

        if booking["booking_status"] == "Confirmed":
            raise HTTPException(
                status_code=409,
                detail="This booking is already confirmed."
            )

        if booking["booking_status"] != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Only pending bookings can be confirmed."
            )

        # Find the matching pending payment record
        cursor.execute(
            """
            SELECT payment_id, amount, payment_status
            FROM payments
            WHERE booking_id = %s
              AND razorpay_order_id = %s
            FOR UPDATE
            """,
            (
                verification.booking_id,
                verification.razorpay_order_id
            )
        )
        payment = cursor.fetchone()

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Matching payment record not found."
            )

        if payment["payment_status"] != "Pending":
            raise HTTPException(
                status_code=400,
                detail="This payment is not pending."
            )

        if payment["amount"] != booking["total_amount"]:
            raise HTTPException(
                status_code=400,
                detail="Payment amount does not match booking amount."
            )

        # Record verified payment and confirm the booking
        cursor.execute(
            """
            UPDATE payments
            SET razorpay_payment_id = %s,
                razorpay_signature = %s,
                payment_status = 'Success'
            WHERE payment_id = %s
            """,
            (
                verification.razorpay_payment_id,
                verification.razorpay_signature,
                payment["payment_id"]
            )
        )

        cursor.execute(
            """
            UPDATE bookings
            SET booking_status = 'Confirmed'
            WHERE booking_id = %s
              AND booking_status = 'Pending'
            """,
            (verification.booking_id,)
        )

        if cursor.rowcount != 1:
            raise HTTPException(
                status_code=409,
                detail="Booking status changed. Please try again."
            )

        connection.commit()

        return {
            "message": "Payment verified and booking confirmed.",
            "booking_id": verification.booking_id,
            "payment_status": "Success",
            "booking_status": "Confirmed"
        }

    except HTTPException:
        if connection and connection.is_connected():
            connection.rollback()
        raise

    except Error:
        if connection and connection.is_connected():
            connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update the verified payment."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.post("/tickets/{booking_id}")
def generate_ticket(booking_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Lock the booking while checking its payment status
        cursor.execute(
            """
            SELECT booking_id, user_id, schedule_id, journey_date,
                   number_of_tickets, total_amount, booking_status
            FROM bookings
            WHERE booking_id = %s
            FOR UPDATE
            """,
            (booking_id,)
        )
        booking = cursor.fetchone()

        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        if booking["booking_status"] != "Confirmed":
            raise HTTPException(
                status_code=400,
                detail="A ticket can only be generated for a confirmed booking."
            )

        # Require a successful payment
        cursor.execute(
            """
            SELECT payment_id
            FROM payments
            WHERE booking_id = %s
              AND payment_status = 'Success'
            LIMIT 1
            """,
            (booking_id,)
        )
        payment = cursor.fetchone()

        if not payment:
            raise HTTPException(
                status_code=400,
                detail="A successful payment is required before issuing a ticket."
            )

        # Return the existing ticket instead of creating a duplicate
        cursor.execute(
            """
            SELECT ticket_id, booking_id, ticket_number, qr_code, issue_date
            FROM tickets
            WHERE booking_id = %s
            """,
            (booking_id,)
        )
        existing_ticket = cursor.fetchone()

        if existing_ticket:
            connection.commit()
            return {
                "message": "Ticket already exists.",
                "ticket": existing_ticket
            }

        # Get journey details for the QR code
        cursor.execute(
            """
            SELECT s.departure_time, s.arrival_time,
                   src.station_name AS source_station,
                   dst.station_name AS destination_station
            FROM bookings b
            JOIN schedules s ON b.schedule_id = s.schedule_id
            JOIN stations src ON b.source_station_id = src.station_id
            JOIN stations dst ON b.destination_station_id = dst.station_id
            WHERE b.booking_id = %s
            """,
            (booking_id,)
        )
        journey = cursor.fetchone()

        if not journey:
            raise HTTPException(
                status_code=404,
                detail="Journey details not found."
            )

        ticket_number = "MTR-" + secrets.token_hex(8).upper()

        qr_data = (
            f"Metro Reservation Ticket\n"
            f"Ticket: {ticket_number}\n"
            f"Booking ID: {booking_id}\n"
            f"Travel Date: {booking['journey_date']}\n"
            f"From: {journey['source_station']}\n"
            f"To: {journey['destination_station']}\n"
            f"Departure: {journey['departure_time']}\n"
            f"Passengers: {booking['number_of_tickets']}"
        )

        # Generate a PNG QR code and store it as a Base64 data URI
        qr_image = qrcode.make(qr_data)
        image_buffer = io.BytesIO()
        qr_image.save(image_buffer, format="PNG")
        qr_base64 = base64.b64encode(
            image_buffer.getvalue()
        ).decode("utf-8")
        qr_data_uri = f"data:image/png;base64,{qr_base64}"

        cursor.execute(
            """
            INSERT INTO tickets (booking_id, ticket_number, qr_code)
            VALUES (%s, %s, %s)
            """,
            (booking_id, ticket_number, qr_data_uri)
        )

        ticket_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT ticket_id, booking_id, ticket_number, qr_code, issue_date
            FROM tickets
            WHERE ticket_id = %s
            """,
            (ticket_id,)
        )
        ticket = cursor.fetchone()

        connection.commit()

        return {
            "message": "Ticket generated successfully.",
            "ticket": ticket
        }

    except HTTPException:
        if connection and connection.is_connected():
            connection.rollback()
        raise

    except Error:
        if connection and connection.is_connected():
            connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not generate the ticket."
        )

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.get("/admin/schedules")
def get_admin_schedules(travel_date: date):
    generate_schedules(travel_date)
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
                SELECT
                    s.schedule_id,
                    s.metro_id,
                    s.route_id,
                    r.route_name,
                    s.schedule_date,
                    s.departure_time,
                    s.arrival_time,
                    s.available_seats,
                    s.running_status
                FROM schedules s
                JOIN routes r ON s.route_id = r.route_id
                WHERE s.schedule_date = %s
                ORDER BY s.schedule_date, s.departure_time, s.schedule_id
            """, (travel_date,))

        schedules = cursor.fetchall()

        return {
            "total": len(schedules),
            "schedules": schedules
        }

    except Error as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve admin schedules."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()

@app.get("/admin/bookings")
def get_admin_bookings():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                b.booking_id,
                b.user_id,
                u.full_name AS customer_name,
                b.schedule_id,
                b.journey_date,
                b.number_of_tickets,
                b.total_amount,
                b.booking_status,
                b.booking_date,
                src.station_name AS source_station,
                dest.station_name AS destination_station,
                p.payment_status
            FROM bookings b
            JOIN users u ON u.user_id = b.user_id
            JOIN stations src
                ON src.station_id = b.source_station_id
            JOIN stations dest
                ON dest.station_id = b.destination_station_id
            LEFT JOIN payments p
                ON p.booking_id = b.booking_id
            ORDER BY b.booking_date DESC, b.booking_id DESC
        """)

        bookings = cursor.fetchall()

        return {"bookings": bookings}

    except Error as error:
        print("Admin bookings database error:", error)
        raise HTTPException(
            status_code=500,
            detail="Could not load customer bookings."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


@app.put("/admin/schedules/{schedule_id}/status")
def update_schedule_status(schedule_id: int, status: str):
    if status not in ["Scheduled", "Cancelled"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be Scheduled or Cancelled."
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT schedule_id
            FROM schedules
            WHERE schedule_id = %s
            """,
            (schedule_id,)
        )

        schedule = cursor.fetchone()

        if not schedule:
            raise HTTPException(
                status_code=404,
                detail="Schedule not found."
            )

        cursor.execute(
            """
            UPDATE schedules
            SET running_status = %s
            WHERE schedule_id = %s
            """,
            (status, schedule_id)
        )

        connection.commit()

        return {
            "message": "Schedule status updated successfully.",
            "schedule_id": schedule_id,
            "running_status": status
        }

    except Error as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not update schedule status."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


@app.put("/users/{user_id}/profile")
def update_user_profile(
    user_id: int,
    full_name: str,
    email: str,
    phone: str = "",
    gender: str = "",
    date_of_birth: str = ""
):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT user_id FROM users WHERE user_id = %s",
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE email = %s AND user_id != %s
            """,
            (email, user_id)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="This email is already used by another account."
            )

        cursor.execute(
            """
            UPDATE users
            SET full_name = %s,
                email = %s,
                phone = %s,
                gender = %s,
                date_of_birth = %s
            WHERE user_id = %s
            """,
            (
                full_name.strip(),
                email.strip(),
                phone.strip(),
                gender.strip() or None,
                date_of_birth or None,
                user_id
            )
        )

        connection.commit()

        return {
            "message": "Profile updated successfully.",
            "user_id": user_id,
            "full_name": full_name.strip(),
            "email": email.strip(),
            "phone": phone.strip(),
            "gender": gender.strip(),
            "date_of_birth": date_of_birth or None
        }

    except HTTPException:
        raise

    except Error as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not update profile."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()