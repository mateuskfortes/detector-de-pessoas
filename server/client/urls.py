from django.urls import path
from . import views

urlpatterns = [
    path("", views.ClassifierView.as_view(), name="index"),
]