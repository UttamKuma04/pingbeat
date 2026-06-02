import requests
from celery import shared_task
from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail


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

    brevo_key = getattr(settings, "BREVO_API_KEY", None)
    brevo_email = getattr(settings, "BREVO_SENDER_EMAIL", None)
    brevo_name = getattr(settings, "BREVO_SENDER_NAME", "PingBEAT")
    from_email = brevo_email or getattr(
        settings,
        "DEFAULT_FROM_EMAIL",
        "alerts@pingbeat.com",
    )

    if brevo_key and brevo_email:
        try:
            response = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                json={
                    "sender": {
                        "name": brevo_name,
                        "email": brevo_email,
                    },
                    "to": [
                        {
                            "email": user.email,
                            "name": user.email,
                        }
                    ],
                    "subject": subject,
                    "textContent": message,
                },
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": brevo_key,
                },
                timeout=10,
            )

            if response.status_code in (200, 201, 202):
                return (
                    f"Registration email sent to "
                    f"{user.email} via Brevo API."
                )

            print(
                f"Brevo registration email failed for "
                f"{user.email}: "
                f"{response.status_code} {response.text}"
            )

        except requests.RequestException as exc:
            print(
                f"Brevo registration email request failed "
                f"for {user.email}: {exc}"
            )

    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return (
        f"Registration email sent to "
        f"{user.email} via Django email backend."
    )