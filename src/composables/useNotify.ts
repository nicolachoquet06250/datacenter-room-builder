import Notify from 'simple-notify';

type NotifyOptions = {
    title?: string,
    text: string,
    autoclose?: boolean,
    autotimeout?: number
};

export const useNotify = () => ({
    error: ({title = 'Error', autoclose = true, autotimeout = 3000, ...options}: NotifyOptions) => {
        new Notify({
            status: 'error',
            title,
            ...options,
            autoclose,
            autotimeout,
            notificationsGap: 20,
            type: 'outline',
            position: 'right top',
            customClass: 'custom-notify'
        })
    },
    success: ({title = 'Success', autoclose = true, autotimeout = 3000, ...options}: NotifyOptions) => {
        new Notify({
            status: 'success',
            title,
            ...options,
            autoclose,
            autotimeout,
            notificationsGap: 20,
            type: 'outline',
            position: 'right top',
            customClass: 'custom-notify'
        })
    }
})