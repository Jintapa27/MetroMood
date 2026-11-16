import pandas as pd
from pathlib import Path

folder = Path(__file__).parent
source = folder / "臺北捷運每日分時各站OD流量統計資料_202609.csv"
output = folder / "processed"
output.mkdir(exist_ok=True)

chunk_size = 200_000

station_parts = []
hour_parts = []
heatmap_parts = []

print("Starting MRT data processing...")

for i, chunk in enumerate(
    pd.read_csv(
        source,
        encoding="utf-8-sig",
        chunksize=chunk_size,
        dtype={"時段": str, "進站": str, "出站": str}
    ),
    start=1
):
    chunk.columns = chunk.columns.str.strip()
    chunk["人次"] = pd.to_numeric(chunk["人次"], errors="coerce").fillna(0)

    #Chart 1: station activity
    origins = chunk.groupby("進站")["人次"].sum()
    destinations = chunk.groupby("出站")["人次"].sum()
    station_parts.append(origins.add(destinations, fill_value=0))

    #Chart 2: total passenger trips by hour
    hour_parts.append(chunk.groupby("時段")["人次"].sum())

    #Chart 3: passenger trips by date and hour
    heatmap_parts.append(
        chunk.groupby(["日期", "時段"])["人次"].sum()
    )

    print(f"Processed chunk {i}...")

stations = pd.concat(station_parts).groupby(level=0).sum()
stations = stations.sort_values(ascending=False)

hours = pd.concat(hour_parts).groupby(level=0).sum()
hours = hours.sort_index()

heatmap = pd.concat(heatmap_parts).groupby(level=[0, 1]).sum()

stations.rename_axis("station").rename("passenger_activity").to_csv(
    output / "station_activity.csv", encoding="utf-8-sig"
)

hours.rename_axis("hour").rename("passenger_trips").to_csv(
    output / "hourly_activity.csv", encoding="utf-8-sig"
)

heatmap.rename("passenger_trips").reset_index().to_csv(
    output / "date_hour_heatmap.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\nFinished! Summary files saved in:", output)
print("\nTop 10 stations:")
print(stations.head(10))
print("\nHourly activity:")
print(hours)
