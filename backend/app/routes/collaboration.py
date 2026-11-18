from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.database.database import get_db
from app.models.collaboration import Announcement, Discussion, DiscussionReply
from app.models.project import Project
from app.models.system import Notification
from app.models.user import User, UserRole
from app.schemas.collaboration import (
    AnnouncementCreate,
    AnnouncementResponse,
    DiscussionCreate,
    DiscussionReplyCreate,
    DiscussionReplyResponse,
    DiscussionResponse,
)
from app.schemas.notification import NotificationResponse

router = APIRouter(
    tags=["Collaboration & Communication"],
)


# --- DISCUSSIONS ---

@router.get(
    "/projects/{project_id}/discussions",
    response_model=List[dict],
)
def list_discussions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    discussions = (
        db.query(Discussion)
        .filter(Discussion.project_id == project_id)
        .order_by(Discussion.created_at.desc())
        .all()
    )
    result = []
    for d in discussions:
        replies = (
            db.query(DiscussionReply)
            .filter(DiscussionReply.discussion_id == d.id)
            .order_by(DiscussionReply.created_at.asc())
            .all()
        )
        result.append({
            "id": d.id,
            "project_id": d.project_id,
            "title": d.title,
            "content": d.content,
            "created_at": d.created_at,
            "author_id": d.user_id,
            "author_name": d.author.name if d.author else "Anonymous",
            "author_role": d.author.role if d.author else "student",
            "reply_count": len(replies),
            "replies": [
                {
                    "id": r.id,
                    "content": r.content,
                    "created_at": r.created_at,
                    "author_id": r.user_id,
                    "author_name": r.author.name if r.author else "Anonymous",
                    "author_role": r.author.role if r.author else "student",
                }
                for r in replies
            ],
        })
    return result


@router.post(
    "/projects/{project_id}/discussions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
def create_discussion(
    project_id: int,
    disc_in: DiscussionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    disc = Discussion(
        project_id=project_id,
        user_id=current_user.id,
        title=disc_in.title,
        content=disc_in.content,
        created_at=datetime.now(timezone.utc),
    )
    db.add(disc)
    db.commit()
    db.refresh(disc)

    return {
        "id": disc.id,
        "project_id": disc.project_id,
        "title": disc.title,
        "content": disc.content,
        "created_at": disc.created_at,
        "author_id": current_user.id,
        "author_name": current_user.name,
        "author_role": current_user.role,
        "reply_count": 0,
        "replies": [],
    }


@router.post(
    "/discussions/{discussion_id}/replies",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
def add_reply(
    discussion_id: int,
    reply_in: DiscussionReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    disc = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")

    reply = DiscussionReply(
        discussion_id=discussion_id,
        user_id=current_user.id,
        content=reply_in.content,
        created_at=datetime.now(timezone.utc),
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)

    return {
        "id": reply.id,
        "content": reply.content,
        "created_at": reply.created_at,
        "author_id": current_user.id,
        "author_name": current_user.name,
        "author_role": current_user.role,
    }


# --- ANNOUNCEMENTS ---

@router.get(
    "/announcements",
    response_model=List[dict],
)
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Announcement)

    # Filter according to role permissions
    if current_user.role not in [UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value]:
        query = query.filter(
            (Announcement.target_role == "all") | (Announcement.target_role == current_user.role)
        )

    announcements = query.order_by(Announcement.created_at.desc()).limit(20).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "target_role": a.target_role,
            "created_at": a.created_at,
            "created_by_name": a.created_by.name if a.created_by else "Admin",
        }
        for a in announcements
    ]


@router.post(
    "/announcements",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement(
    ann_in: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([
            UserRole.SUPER_ADMIN.value,
            UserRole.UNIVERSITY_ADMIN.value,
            UserRole.HOD.value,
            UserRole.FACULTY.value,
        ])
    ),
):
    ann = Announcement(
        title=ann_in.title,
        content=ann_in.content,
        target_role=ann_in.target_role or "all",
        department_id=ann_in.department_id or current_user.department_id,
        created_by_id=current_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    return {
        "id": ann.id,
        "title": ann.title,
        "content": ann.content,
        "target_role": ann.target_role,
        "created_at": ann.created_at,
        "created_by_name": current_user.name,
    }


# --- NOTIFICATIONS ---

@router.get(
    "/notifications",
    response_model=dict,
)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    unread_count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()

    items = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "reference_link": n.reference_link,
            "is_read": n.is_read,
            "created_at": n.created_at,
        }
        for n in notifs
    ]

    return {
        "unread_count": unread_count,
        "notifications": items,
    }


@router.put(
    "/notifications/{notification_id}/read",
    response_model=dict,
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Notification marked as read"}


@router.put(
    "/notifications/read-all",
    response_model=dict,
)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
