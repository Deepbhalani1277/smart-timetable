from datetime import datetime


def serialize_datetime(dt):
    return dt.isoformat() if dt else None


def serialize_time(t):
    return t.strftime("%H:%M") if t else None


def paginate_query(query, page, per_page, max_per_page=100):
    per_page = min(max(per_page, 1), max_per_page)
    page = max(page, 1)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": max(1, -(-total // per_page)),
    }


def parse_pagination(args):
    try:
        page = int(args.get("page", 1))
        per_page = int(args.get("per_page", 20))
    except (ValueError, TypeError):
        page, per_page = 1, 20
    return max(page, 1), max(min(per_page, 100), 1)
