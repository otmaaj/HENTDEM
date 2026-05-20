from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent  # FASTAPI/
MEDIA_DIR = BASE_DIR / 'media'

def get_manga_list():
    if not MEDIA_DIR.exists():
        return []
    return sorted([f.name for f in MEDIA_DIR.iterdir() if f.is_dir()])

def get_photo(manga : str):
    photo_file = MEDIA_DIR / manga
    photo = sorted([f.name for f in photo_file.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")])
    return photo[0] if photo else None


def get_pages(manga : str):
    chapter_dir = MEDIA_DIR / manga
    if not chapter_dir.exists():
        return None
    return sorted([f.name for f in chapter_dir.iterdir()
                   if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")])