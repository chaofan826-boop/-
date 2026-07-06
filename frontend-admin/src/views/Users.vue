<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUsers, type User } from '@/api/user'

const users = ref<User[]>([])

onMounted(async () => {
  users.value = await getUsers()
})
</script>

<template>
  <div>
    <h2>Users</h2>
    <el-table :data="users" stripe style="margin-top: 16px">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="Name" />
      <el-table-column prop="email" label="Email" />
      <el-table-column prop="role" label="Role" />
    </el-table>
  </div>
</template>
