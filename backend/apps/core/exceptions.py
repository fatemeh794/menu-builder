from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Wrap DRF's default handler so every error response has a
    consistent {"detail": ...} (or field-error dict) shape the frontend
    can rely on without special-casing exception types.
    """
    response = exception_handler(exc, context)
    if response is not None:
        response.data.setdefault("status_code", response.status_code)
    return response
