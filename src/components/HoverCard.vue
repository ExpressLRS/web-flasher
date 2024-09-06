<script setup>
import {VCard, VCardText, VCardTitle, VHover} from 'vuetify/components'

defineProps(['image', 'hoverImage', 'title', 'text'])
</script>

<template>
  <VHover v-slot:default="{ isHovering, props }">
    <VCard v-bind="$attrs, props" :class="isHovering ? 'hover-card' : 'default-card'">
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

.default-card {
  border-radius: 0.5rem;
  border: 1px solid #EFEFEF;
  background-color: #ffffff;
  transition: all ease-in 300ms;
  box-shadow: none;
  text-align: left;
  padding: 0;
}

.hover-card {
  border-radius: 0.5rem;
  background-color: #ffffff;
  transform: scale(104%);
  transition: all ease-in 300ms;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.16);
  text-align: left;
  padding: 0;
}

.v-card-title {
  padding: 0 20px 0 20px;
}

.v-card-text {
  padding: 0 20px 20px 20px;
}

.v-card-title {
  margin: 1.5rem 0 0.25rem 0;
  font-weight: 600;
  color: #242527;
}

.v-card-text {
  color: #656669
}

.parent {
  display: flex;
  justify-content: center;
  background-color: #D7F4ED;
  height: 140px;
  align-items: center;
}

</style>