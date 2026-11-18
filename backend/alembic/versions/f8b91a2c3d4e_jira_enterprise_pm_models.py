"""jira_enterprise_pm_models

Revision ID: f8b91a2c3d4e
Revises: e4dc2300ade1
Create Date: 2026-11-18 19:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8b91a2c3d4e'
down_revision: Union[str, None] = 'e4dc2300ade1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Upgrade tasks table with Jira-inspired Issue Tracking columns
    op.add_column('tasks', sa.Column('issue_key', sa.String(length=50), nullable=True))
    op.add_column('tasks', sa.Column('issue_type', sa.String(length=50), server_default='task', nullable=False))
    op.add_column('tasks', sa.Column('epic_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('reporter_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('story_points', sa.Integer(), server_default='0', nullable=False))
    op.add_column('tasks', sa.Column('labels', sa.String(length=255), nullable=True))
    op.add_column('tasks', sa.Column('order_rank', sa.Float(), server_default='0.0', nullable=False))

    op.create_index(op.f('ix_tasks_issue_key'), 'tasks', ['issue_key'], unique=True)
    op.create_index(op.f('ix_tasks_issue_type'), 'tasks', ['issue_type'], unique=False)
    op.create_index(op.f('ix_tasks_epic_id'), 'tasks', ['epic_id'], unique=False)
    op.create_index(op.f('ix_tasks_reporter_id'), 'tasks', ['reporter_id'], unique=False)

    op.create_foreign_key('fk_tasks_epic_id', 'tasks', 'tasks', ['epic_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_tasks_reporter_id', 'tasks', 'users', ['reporter_id'], ['id'], ondelete='SET NULL')

    # Backfill issue_key for all existing tasks with DEV-1000 + id
    op.execute("UPDATE tasks SET issue_key = 'DEV-' || (1000 + id) WHERE issue_key IS NULL")

    # 2. Create work_logs table
    op.create_table(
        'work_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('hours_spent', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logged_date', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_work_logs_id'), 'work_logs', ['id'], unique=False)
    op.create_index(op.f('ix_work_logs_task_id'), 'work_logs', ['task_id'], unique=False)
    op.create_index(op.f('ix_work_logs_user_id'), 'work_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_work_logs_logged_date'), 'work_logs', ['logged_date'], unique=False)

    # 3. Create project_workflows table
    op.create_table(
        'project_workflows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('project_type', sa.String(length=50), server_default='standard', nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_workflows_id'), 'project_workflows', ['id'], unique=False)
    op.create_index(op.f('ix_project_workflows_project_id'), 'project_workflows', ['project_id'], unique=False)

    # 4. Create workflow_statuses table
    op.create_table(
        'workflow_statuses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), server_default='in_progress', nullable=False),
        sa.Column('color', sa.String(length=20), server_default='#3b82f6', nullable=False),
        sa.Column('order_index', sa.Integer(), server_default='0', nullable=False),
        sa.Column('wip_limit', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['workflow_id'], ['project_workflows.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_statuses_id'), 'workflow_statuses', ['id'], unique=False)
    op.create_index(op.f('ix_workflow_statuses_workflow_id'), 'workflow_statuses', ['workflow_id'], unique=False)

    # 5. Create workflow_transitions table
    op.create_table(
        'workflow_transitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('from_status_code', sa.String(length=50), nullable=False),
        sa.Column('to_status_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.Column('required_role', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['workflow_id'], ['project_workflows.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_transitions_id'), 'workflow_transitions', ['id'], unique=False)
    op.create_index(op.f('ix_workflow_transitions_workflow_id'), 'workflow_transitions', ['workflow_id'], unique=False)

    # 6. Create automation_rules table
    op.create_table(
        'automation_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('trigger_event', sa.String(length=100), nullable=False),
        sa.Column('conditions_json', sa.Text(), nullable=True),
        sa.Column('actions_json', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('execution_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_automation_rules_id'), 'automation_rules', ['id'], unique=False)
    op.create_index(op.f('ix_automation_rules_project_id'), 'automation_rules', ['project_id'], unique=False)

    # 7. Create automation_logs table
    op.create_table(
        'automation_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rule_id', sa.Integer(), nullable=False),
        sa.Column('trigger_event', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='success', nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rule_id'], ['automation_rules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_automation_logs_id'), 'automation_logs', ['id'], unique=False)
    op.create_index(op.f('ix_automation_logs_rule_id'), 'automation_logs', ['rule_id'], unique=False)
    op.create_index(op.f('ix_automation_logs_executed_at'), 'automation_logs', ['executed_at'], unique=False)

    # 8. Create project_risks table
    op.create_table(
        'project_risks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), server_default='Technical', nullable=False),
        sa.Column('probability', sa.String(length=50), server_default='Medium', nullable=False),
        sa.Column('impact', sa.String(length=50), server_default='Medium', nullable=False),
        sa.Column('severity', sa.String(length=50), server_default='Medium', nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('mitigation_plan', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='identified', nullable=False),
        sa.Column('review_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_risks_id'), 'project_risks', ['id'], unique=False)
    op.create_index(op.f('ix_project_risks_project_id'), 'project_risks', ['project_id'], unique=False)

    # 9. Create wiki_pages table
    op.create_table(
        'wiki_pages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=100), server_default='General', nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wiki_pages_id'), 'wiki_pages', ['id'], unique=False)
    op.create_index(op.f('ix_wiki_pages_project_id'), 'wiki_pages', ['project_id'], unique=False)
    op.create_index(op.f('ix_wiki_pages_slug'), 'wiki_pages', ['slug'], unique=False)

    # 10. Create saved_filters table
    op.create_table(
        'saved_filters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('filter_criteria', sa.Text(), nullable=False),
        sa.Column('is_favorite', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saved_filters_id'), 'saved_filters', ['id'], unique=False)
    op.create_index(op.f('ix_saved_filters_user_id'), 'saved_filters', ['user_id'], unique=False)

    # 11. Create project_templates table
    op.create_table(
        'project_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), server_default='Software', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_structure_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_templates_id'), 'project_templates', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('project_templates')
    op.drop_table('saved_filters')
    op.drop_table('wiki_pages')
    op.drop_table('project_risks')
    op.drop_table('automation_logs')
    op.drop_table('automation_rules')
    op.drop_table('workflow_transitions')
    op.drop_table('workflow_statuses')
    op.drop_table('project_workflows')
    op.drop_table('work_logs')

    op.drop_constraint('fk_tasks_reporter_id', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_epic_id', 'tasks', type_='foreignkey')
    op.drop_index(op.f('ix_tasks_reporter_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_epic_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_issue_type'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_issue_key'), table_name='tasks')
    op.drop_column('tasks', 'order_rank')
    op.drop_column('tasks', 'labels')
    op.drop_column('tasks', 'story_points')
    op.drop_column('tasks', 'reporter_id')
    op.drop_column('tasks', 'epic_id')
    op.drop_column('tasks', 'issue_type')
    op.drop_column('tasks', 'issue_key')
