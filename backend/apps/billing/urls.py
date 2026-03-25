from django.urls import path

from . import views

app_name = "billing"

urlpatterns = [
    path("balance/", views.BalanceView.as_view(), name="balance"),
    path(
        "transactions/",
        views.TransactionListView.as_view(),
        name="transactions",
    ),
    path("plans/", views.PlansView.as_view(), name="plans"),
]
