from celery import shared_task
from django.contrib.auth.models import User

from config.emailing import send_transactional_email


@shared_task
def send_registration_confirmation_email(user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return f"User {user_id} does not exist."

    if not user.email:
        return f"User {user_id} does not have an email address."

    subject = "Welcome to PingBEAT - Your Uptime Monitoring Journey Begins!"
    message = (
        f"Hello {user.email},\n\n"
        "Thanks for joining PingBEAT.\n\n"
        "PingBEAT helps you monitor websites, APIs, and applications with real-time uptime checks,\n"
        "performance monitoring, SSL tracking, incident alerts, and status pages.\n\n"
        "Log in to your dashboard and create your first monitor to start protecting your services.\n\n"
        "Best regards,\n"
        "The PingBEAT Team"
    )

    return send_transactional_email(subject, message, user.email, recipient_name=user.email)
