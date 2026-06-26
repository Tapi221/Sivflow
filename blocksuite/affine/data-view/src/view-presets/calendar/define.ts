import { viewType } from '../../core/view/data-view.js';
import { I18n } from '@affine/i18n';
import { CalendarSingleView } from './calendar-view-manager.js';
import type { CalendarViewData } from './types.js';

export const calendarViewType = viewType('calendar');

export const calendarViewModel = calendarViewType.createModel<CalendarViewData>(
  {
    defaultName: () => I18n.t('com.affine.data-view.calendar-view') || 'Calendar View',
    dataViewManager: CalendarSingleView,
    defaultData: viewManager => {
      return {
        filter: {
          type: 'group',
          op: 'and',
          conditions: [],
        },
        date: {},
        card: {
          titleColumnId: viewManager.dataSource.properties$.value.find(
            id => viewManager.dataSource.propertyTypeGet(id) === 'title'
          ),
          visiblePropertyIds: [],
        },
        sources: {
          workspaceCalendar: {
            enabled: true,
          },
        },
        ui: {},
      };
    },
  }
);
