import { defineStore } from 'pinia'
import type { Job, JobStatus } from '@/app/types'
import { generateFileId } from '@/utils/file'
import { removeQueueJob as removeFromIDB, clearAllTempFiles } from '@/utils/idb'

interface QueueState {
  jobs: Job[]
}

export const useQueueStore = defineStore('queue', {
  state: (): QueueState => ({
    jobs: []
  }),

  getters: {
    completedJobs: (state) => state.jobs.filter(j => j.status === 'completed'),
    getJobById: (state) => (id: string) => state.jobs.find(j => j.id === id)
  },

  actions: {
    addJob(job: Omit<Job, 'id' | 'createdAt'>) {
      const newJob: Job = {
        ...job,
        id: generateFileId(),
        createdAt: Date.now()
      }
      this.jobs.push(newJob)
      return newJob.id
    },

    restoreJob(job: Omit<Job, 'createdAt'> & { id: string }) {
      if (this.jobs.some(j => j.id === job.id)) {
        return job.id
      }

      const restoredJob: Job = {
        ...job,
        createdAt: Date.now()
      }
      this.jobs.push(restoredJob)
      return restoredJob.id
    },

    updateJob(id: string, updates: Partial<Job>) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        Object.assign(job, updates)
      }
    },

    updateJobStatus(id: string, status: JobStatus) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.status = status
        if (status === 'completed' || status === 'error') {
          job.completedAt = Date.now()
        }
      }
    },

    setJobError(id: string, error: string) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.status = 'error'
        job.error = error
        job.completedAt = Date.now()
      }
    },

    setJobResult(id: string, result: Blob) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.result = result
        job.status = 'completed'
        job.completedAt = Date.now()
      }
    },

    async removeJob(id: string) {
      const job = this.jobs.find(j => j.id === id)
      if (job?.thumbnail) {
        URL.revokeObjectURL(job.thumbnail)
      }
      const index = this.jobs.findIndex(j => j.id === id)
      if (index !== -1) {
        this.jobs.splice(index, 1)
      }
      await removeFromIDB(id)
    },

    async clearAll() {
      this.jobs.forEach(j => {
        if (j.thumbnail) {
          URL.revokeObjectURL(j.thumbnail)
        }
      })
      this.jobs = []

      await clearAllTempFiles()
    }
  }
})
