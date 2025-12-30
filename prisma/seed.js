import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // =========================================================================
  // 1. CREATE ADMIN USER
  // =========================================================================
  console.log('👤 Creating admin user...');

  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mamacita.com' },
    update: {},
    create: {
      email: 'admin@mamacita.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isVerified: true,
      adminProfile: {
        create: {
          fullName: 'Admin Mamacita',
          role: 'super_admin'
        }
      }
    }
  });

  console.log('✅ Admin created:', admin.email);

  // =========================================================================
  // 2. CREATE SAMPLE MOTHERS
  // =========================================================================
  console.log('\n👩 Creating sample mothers...');

  const motherPassword = await bcrypt.hash('password123', 10);

  const maria = await prisma.user.create({
    data: {
      email: 'maria.silva@example.com',
      passwordHash: motherPassword,
      role: 'MOTHER',
      isVerified: true,
      motherProfile: {
        create: {
          fullName: 'Maria Silva',
          location: 'São Paulo, SP',
          isFirstPregnancy: true,
          interests: ['parto', 'amamentacao', 'yoga'],
          onboardingDone: true,
          pregnancy: {
            create: {
              dueDate: new Date('2025-08-15'),
              currentWeek: 24,
              status: 'ACTIVE'
            }
          }
        }
      }
    }
  });

  const ana = await prisma.user.create({
    data: {
      email: 'ana.costa@example.com',
      passwordHash: motherPassword,
      role: 'MOTHER',
      isVerified: true,
      motherProfile: {
        create: {
          fullName: 'Ana Costa',
          location: 'Rio de Janeiro, RJ',
          isFirstPregnancy: false,
          interests: ['nutricao', 'exercicios'],
          onboardingDone: true,
          pregnancy: {
            create: {
              dueDate: new Date('2025-07-20'),
              currentWeek: 28,
              status: 'ACTIVE'
            }
          }
        }
      }
    }
  });

  console.log('✅ Created mothers: Maria Silva, Ana Costa');

  // =========================================================================
  // 3. CREATE SAMPLE COLLABORATORS
  // =========================================================================
  console.log('\n👩‍⚕️ Creating sample collaborators...');

  const collabPassword = await bcrypt.hash('collab123', 10);

  const draNutri = await prisma.user.create({
    data: {
      email: 'dra.nutri@example.com',
      passwordHash: collabPassword,
      role: 'COLLABORATOR',
      isVerified: true,
      collaboratorProfile: {
        create: {
          fullName: 'Dra. Carolina Nutricionista',
          profession: 'Nutricionista',
          specialties: ['nutrição materno-infantil', 'gestação'],
          credentials: 'CRN 12345-SP',
          isVerified: true
        }
      }
    }
  });

  const doulaCarla = await prisma.user.create({
    data: {
      email: 'doula.carla@example.com',
      passwordHash: collabPassword,
      role: 'COLLABORATOR',
      isVerified: true,
      collaboratorProfile: {
        create: {
          fullName: 'Carla Mendes - Doula',
          profession: 'Doula',
          specialties: ['parto humanizado', 'acompanhamento pré-natal'],
          credentials: 'Certificação Internacional de Doula',
          isVerified: true
        }
      }
    }
  });

  console.log('✅ Created collaborators: Dra. Carolina, Doula Carla');

  // =========================================================================
  // 4. CREATE SAMPLE WEEKLY CONTENT (Week 24 as example)
  // =========================================================================
  console.log('\n📅 Creating sample weekly content...');

  const week24 = await prisma.weeklyContent.upsert({
    where: { week: 24 },
    update: {},
    create: {
      week: 24,
      babySize: 'Seu bebê tem o tamanho de uma espiga de milho 🌽',
      babyDevelopment: '<p>Nesta semana, seu bebê está desenvolvendo padrões de sono e vigília. Os pulmões continuam a se desenvolver, formando os alvéolos que serão essenciais para a respiração após o nascimento.</p>',
      motherBody: '<p>Você pode começar a sentir contrações de Braxton Hicks (contrações de treinamento). Seu útero está crescendo e pode estar pressionando suas costelas.</p>',
      tips: '<ul><li>Faça exercícios leves como caminhada</li><li>Mantenha-se hidratada</li><li>Descanse sempre que possível</li></ul>',
      checklist: JSON.stringify([
        'Agendar ultrassom morfológico',
        'Começar a pensar em nomes',
        'Pesquisar sobre cursos de parto'
      ])
    }
  });

  console.log('✅ Created weekly content for week 24');

  // =========================================================================
  // 5. CREATE SAMPLE COMMUNITY GROUP
  // =========================================================================
  console.log('\n👥 Creating sample community group...');

  const mariaProfile = await prisma.motherProfile.findFirst({
    where: { fullName: 'Maria Silva' }
  });

  const group = await prisma.group.create({
    data: {
      name: 'Mães de Primeira Viagem',
      description: 'Grupo de apoio para mães de primeira viagem. Compartilhe suas dúvidas, medos e alegrias!',
      isPublic: true,
      category: 'Primeira Viagem',
      createdById: mariaProfile.id,
      members: {
        create: [
          { userId: mariaProfile.id, role: 'ADMIN' }
        ]
      }
    }
  });

  console.log('✅ Created group: Mães de Primeira Viagem');

  // =========================================================================
  // 6. CREATE SAMPLE CLASS
  // =========================================================================
  console.log('\n📚 Creating sample class...');

  const nutriProfile = await prisma.collaboratorProfile.findFirst({
    where: { fullName: 'Dra. Carolina Nutricionista' }
  });

  const nutritionClass = await prisma.class.create({
    data: {
      title: 'Nutrição na Gravidez - Guia Completo',
      description: 'Aprenda tudo sobre alimentação saudável durante a gestação. Descubra quais alimentos priorizar, o que evitar e como montar um cardápio equilibrado.',
      category: 'Nutrição',
      difficulty: 'Iniciante',
      instructorId: nutriProfile.id,
      isFree: true,
      isPublished: true,
      videos: {
        create: [
          {
            title: 'Introdução à Nutrição na Gravidez',
            description: 'Entenda a importância da alimentação para você e seu bebê',
            videoUrl: 'https://example.com/video1.mp4',
            duration: 600, // 10 minutes
            order: 1,
            isPreview: true
          },
          {
            title: 'Alimentos Essenciais para Cada Trimestre',
            description: 'Descubra quais nutrientes são mais importantes em cada fase',
            videoUrl: 'https://example.com/video2.mp4',
            duration: 900, // 15 minutes
            order: 2,
            isPreview: false
          }
        ]
      }
    }
  });

  console.log('✅ Created class: Nutrição na Gravidez');

  // =========================================================================
  // 7. CREATE SAMPLE EVENT
  // =========================================================================
  console.log('\n📅 Creating sample event...');

  const doulaProfile = await prisma.collaboratorProfile.findFirst({
    where: { fullName: 'Carla Mendes - Doula' }
  });

  const event = await prisma.event.create({
    data: {
      title: 'Workshop: Preparação para o Parto Natural',
      description: 'Workshop online sobre preparação física e emocional para o parto natural. Técnicas de respiração, posições e muito mais!',
      type: 'ONLINE',
      category: 'Workshop',
      startDate: new Date('2025-02-15T10:00:00Z'),
      endDate: new Date('2025-02-15T12:00:00Z'),
      meetingLink: 'https://zoom.us/j/example',
      capacity: 50,
      waitlistEnabled: true,
      organizerId: doulaProfile.id,
      isFree: true,
      isPublished: true
    }
  });

  console.log('✅ Created event: Workshop Preparação para o Parto');

  console.log('\n✨ Database seeding completed successfully!\n');
  console.log('📧 Login credentials:');
  console.log('   Admin: admin@mamacita.com / admin123');
  console.log('   Mother: maria.silva@example.com / password123');
  console.log('   Collaborator: dra.nutri@example.com / collab123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
