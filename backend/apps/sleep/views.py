from datetime import date, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SleepEntry
from .serializers import SleepEntrySerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sleep_list_create(request):
    if request.method == 'GET':
        entries = SleepEntry.objects.filter(user=request.user).order_by('-sleep_date')
        serializer = SleepEntrySerializer(entries, many=True)
        return Response(serializer.data)

    # POST: Create entry
    serializer = SleepEntrySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    sleep_date = serializer.validated_data.get('sleep_date', date.today())
    if SleepEntry.objects.filter(user=request.user, sleep_date=sleep_date).exists():
        return Response(
            {"detail": f"Sleep entry already exists for {sleep_date}. Use PUT/PATCH to update."},
            status=status.HTTP_400_BAD_REQUEST
        )

    entry = serializer.save(user=request.user)
    return Response(SleepEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sleep_today(request):
    today = date.today()
    try:
        entry = SleepEntry.objects.get(user=request.user, sleep_date=today)
        return Response(SleepEntrySerializer(entry).data)
    except SleepEntry.DoesNotExist:
        return Response({"detail": "No sleep record for today."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def sleep_detail(request, sleep_id):
    try:
        entry = SleepEntry.objects.get(id=sleep_id, user=request.user)
    except SleepEntry.DoesNotExist:
        return Response({"detail": "Sleep record not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SleepEntrySerializer(entry).data)

    if request.method in ['PUT', 'PATCH']:
        partial = (request.method == 'PATCH')
        serializer = SleepEntrySerializer(entry, data=request.data, partial=partial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated_entry = serializer.save()
        return Response(SleepEntrySerializer(updated_entry).data)

    if request.method == 'DELETE':
        entry.delete()
        return Response({"detail": "Sleep record deleted successfully."}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sleep_stats(request):
    user_entries = SleepEntry.objects.filter(user=request.user).order_by('-sleep_date')
    total_logs = user_entries.count()

    if total_logs == 0:
        return Response({
            "has_data": False,
            "latest_hours": 0.0,
            "formatted_latest": "No sleep data",
            "avg_7d": 0.0,
            "formatted_avg": "—",
            "sleep_quality": None,
            "total_logs": 0,
        })

    latest = user_entries.first()
    cutoff_7d = date.today() - timedelta(days=7)
    recent_entries = user_entries.filter(sleep_date__gte=cutoff_7d)

    if recent_entries.exists():
        avg_hours = sum(e.total_sleep_hours for e in recent_entries) / float(recent_entries.count())
    else:
        avg_hours = latest.total_sleep_hours

    # Format human-readable string (e.g. 7h 48m)
    def fmt_hours(hrs):
        h = int(hrs)
        m = int(round((hrs - h) * 60))
        if m == 60:
            h += 1
            m = 0
        if h > 0 and m > 0:
            return f"{h}h {m}m"
        elif h > 0:
            return f"{h}h"
        else:
            return f"{m}m"

    return Response({
        "has_data": True,
        "latest_hours": round(latest.total_sleep_hours, 2),
        "formatted_latest": fmt_hours(latest.total_sleep_hours),
        "avg_7d": round(avg_hours, 2),
        "formatted_avg": fmt_hours(avg_hours),
        "sleep_quality": latest.sleep_quality.capitalize(),
        "total_logs": total_logs,
    })
