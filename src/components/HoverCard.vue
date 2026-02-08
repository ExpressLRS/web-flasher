<script setup>
import {VCard, VCardText, VCardTitle, VHover} from 'vuetify/components'

defineProps(['image', 'hoverImage', 'title', 'text'])
</script>

<template>
  <VHover v-slot:default="{ isHovering, props }">
    <VCard v-bind="$attrs, props" class='default-card' :class="{'hover-card' : isHovering}">
      <div class="option-card">
        <div class="option-icon">
          <img :src="image" height="56" width="56"/>
        </div>
        <div class="option-content">
          <VCardTitle>{{ title }}</VCardTitle>
          <VCardText>{{ text }}</VCardText>
        </div>
      </div>
    </VCard>
  </VHover>
</template>

<style scoped>
.default-card {
  border-radius: 8px;
  border: none;
  background: #1f1f1f;
  transition: background-color 200ms ease;
  box-shadow: none;
  text-align: left;
  padding: 0;
  width: 100%;
  height: 125px;
}

.hover-card {
  background: #303030;
  box-shadow: none;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.option-icon {
  position: relative;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
}

.option-icon img {
  width: 56px;
  height: 56px;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 320px;
  height: 85px;
  justify-content: center;
}

.v-card-title {
  padding: 0;
  margin: 0;
  font-weight: 600;
  font-size: 16px;
  color: #ffffff;
}

.v-card-text {
  padding: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #9ca3af;
}

@media (max-width: 640px) {
  .default-card {
    height: auto;
  }

  .option-card {
    gap: 12px;
    padding: 16px;
    align-items: center;
  }

  .option-icon {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
  }

  .option-icon img {
    width: 44px;
    height: 44px;
  }

  .option-content {
    width: 100%;
    min-width: 0;
    height: auto;
  }
}

</style>