<script setup>
import {VHover, VCard, VCardTitle, VCardText, VLayout, VImg, VLabel} from 'vuetify/components'

defineProps(['image', 'hoverImage', 'title', 'text'])
</script>

<template>
  <VHover v-slot:default="{ isHovering, props }">
    <VCard v-bind="$attrs, props" :class="isHovering ? 'elevation-16' : undefined" variant="tonal">
      <div class="parent">
        <img :src="image" height="100px" width="100px"/>
        <img :src="hoverImage" height="100px" width="100px" :class="isHovering ? 'fadeInImage' : 'fadeOutImage'"/>
      </div>
      <VCardTitle>{{ title }}</VCardTitle>
      <VCardText>{{ text }}
      </VCardText>
    </VCard>
  </VHover>
</template>

<style scoped>
.parent {
  padding-top: 20px;
  display: flex;
  justify-content: center;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.fadeOutImage {
  animation: fadeOut 1s forwards;
  position: absolute;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.fadeInImage {
  animation: fadeIn 1s forwards;
  position: absolute;
}

</style>