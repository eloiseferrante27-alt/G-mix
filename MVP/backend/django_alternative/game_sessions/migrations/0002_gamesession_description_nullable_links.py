from django.db import migrations, models
import django.db.models.deletion
from django.db.models import F, Q


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_profile_role'),
        ('organizations', '0001_initial'),
        ('scenarios', '0001_initial'),
        ('game_sessions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamesession',
            name='description',
            field=models.TextField(default=''),
        ),
        migrations.AlterField(
            model_name='gamesession',
            name='formateur',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.RESTRICT, related_name='formateur_sessions', to='accounts.profile'),
        ),
        migrations.AlterField(
            model_name='gamesession',
            name='scenario',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.RESTRICT, related_name='sessions', to='scenarios.scenario'),
        ),
        migrations.AddConstraint(
            model_name='gamesession',
            constraint=models.CheckConstraint(
                check=Q(status='draft') | (Q(scenario__isnull=False) & Q(formateur__isnull=False)),
                name='django_game_sessions_required_links_when_not_draft',
            ),
        ),
        migrations.AddConstraint(
            model_name='gamesession',
            constraint=models.CheckConstraint(
                check=Q(current_turn__gte=0) & Q(current_turn__lte=F('total_turns')),
                name='django_game_sessions_turn_bounds',
            ),
        ),
    ]
